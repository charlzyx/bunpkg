import url from 'url';
import https, { RequestOptions } from 'https';
import path from 'path';
import type { Transform } from 'stream';
import type { IncomingMessage } from 'http';
import tar from 'tar-stream';
import gunzip from 'gunzip-maybe';
import { LRUCache } from 'lru-cache';
import semver from 'semver';

import bufferStream from './bufferStream';
import getContentType from './getContentType';
import getIntegrity from './getIntegrity';

const npmRegistryURL =
  process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org';

const agent = new https.Agent({
  keepAlive: true
});

const oneMegabyte = 1024 * 1024;
const oneSecond = 1000;
const oneMinute = oneSecond * 60;

const cache = new LRUCache<string, string>({
  max: 500,
  // alexgorbatchev: fixes for `lru-cache@^7.0.0`
  ttl: oneSecond * 5,
  sizeCalculation: value => Buffer.byteLength(value as any) || 1,
  maxSize: oneMegabyte
});

// compatible with old version
const cset = cache.set.bind(cache);

cache.set = (key, value, opts) => {
  if (typeof opts === 'number') {
    opts = { ttl: opts };
  }
  return cset(key, value, opts);
};

const notFound = '';

function get(options: RequestOptions) {
  return new Promise<IncomingMessage>((accept, reject) => {
    https.get(options, accept).on('error', reject);
  });
}

function isScopedPackageName(packageName: string) {
  return packageName.startsWith('@');
}

function encodePackageName(packageName: string) {
  return isScopedPackageName(packageName)
    ? `@${encodeURIComponent(packageName.substring(1))}`
    : encodeURIComponent(packageName);
}

async function fetchPackageInfo(packageName: string, log: typeof console) {
  const cacheKey = `pkg-info-${packageName}`;
  const cacheValue = cache.get(cacheKey);

  if (cacheValue != null) {
    return cacheValue === notFound ? null : JSON.parse(cacheValue);
  }

  const name = encodePackageName(packageName);
  const infoURL = `${npmRegistryURL}/${name}`;

  log.debug('Fetching package info for %s from %s', packageName, infoURL);

  const { hostname, pathname } = url.parse(infoURL);
  const options: RequestOptions = {
    agent: agent,
    hostname: hostname,
    path: pathname,
    headers: {
      Accept: 'application/json'
    }
  };

  const res = await get(options);

  if (res.statusCode === 200) {
    return bufferStream(res).then(value => {
      cache.set(cacheKey, value, { ttl: oneMinute });
      return JSON.parse(value);
    });
  }

  if (res.statusCode === 404) {
    cache.set(cacheKey, notFound, { ttl: 5 * oneMinute });
    return null;
  }

  const content = (await bufferStream(res)).toString('utf-8');

  log.error(
    'Error fetching info for %s (status: %s)',
    packageName,
    res.statusCode
  );
  log.error(content);

  return null;
}

async function fetchVersionsAndTags(packageName: string, log: typeof console) {
  const info = await fetchPackageInfo(packageName, log);
  return info?.versions
    ? { versions: Object.keys(info.versions), tags: info['dist-tags'] }
    : null;
}

/**
 * Returns an object of available { versions, tags }.
 * Uses a cache to avoid over-fetching from the registry.
 */
export async function getVersionsAndTags(
  packageName: string,
  log: typeof console
) {
  const cacheKey = `versions-${packageName}`;
  const cacheValue = cache.get(cacheKey);

  if (cacheValue != null) {
    return cacheValue === notFound ? null : JSON.parse(cacheValue);
  }

  const value = await fetchVersionsAndTags(packageName, log);

  if (value == null) {
    cache.set(cacheKey, notFound, { ttl: 5 * oneMinute });
    return null;
  }

  cache.set(cacheKey, JSON.stringify(value), { ttl: oneMinute });
  return value;
}

// All the keys that sometimes appear in package info
// docs that we don't need. There are probably more.
const packageConfigExcludeKeys = [
  'browserify',
  'bugs',
  'directories',
  'engines',
  'files',
  'homepage',
  'keywords',
  'maintainers',
  'scripts'
];

function cleanPackageConfig(config: Record<string, string>) {
  return Object.keys(config).reduce<typeof config>((memo, key) => {
    if (!key.startsWith('_') && !packageConfigExcludeKeys.includes(key)) {
      memo[key] = config[key];
    }

    return memo;
  }, {});
}

async function fetchPackageConfig(
  packageName: string,
  version: string,
  log: typeof console
) {
  const info = await fetchPackageInfo(packageName, log);
  return info?.versions && version in info.versions
    ? cleanPackageConfig(info.versions[version])
    : null;
}

/**
 * Returns metadata about a package, mostly the same as package.json.
 * Uses a cache to avoid over-fetching from the registry.
 */
export async function getPackageConfig(
  packageName: string,
  version: string,
  log: typeof console
): Promise<Record<string, any> | null> {
  const cacheKey = `config-${packageName}-${version}`;
  const cacheValue = cache.get(cacheKey);

  if (cacheValue != null) {
    return cacheValue === notFound ? null : JSON.parse(cacheValue);
  }

  const value = await fetchPackageConfig(packageName, version, log);

  if (value == null) {
    cache.set(cacheKey, notFound, { ttl: 5 * oneMinute });
    return null;
  }

  cache.set(cacheKey, JSON.stringify(value), { ttl: oneMinute });
  return value;
}

/**
 * Returns a stream of the tarball'd contents of the given package.
 */
export async function getPackage(
  packageName: string,
  version: string,
  log: typeof console
) {
  const tarballName = isScopedPackageName(packageName)
    ? packageName.split('/')[1]
    : packageName;
  const pkgConfig = await getPackageConfig(packageName, version, log);
  const tarballURL = pkgConfig?.dist
    ? pkgConfig?.dist?.tarball
    : `${npmRegistryURL}/${packageName}/-/${tarballName}-${version}.tgz`;

  log.debug('Fetching package for %s from %s', packageName, tarballURL);

  const { hostname, pathname } = url.parse(tarballURL);
  const options = {
    agent: agent,
    hostname: hostname,
    path: pathname
  };

  const res = await get(options);

  if (res.statusCode === 200) {
    const stream = res.pipe(gunzip());
    // stream.pause();
    return stream;
  }

  if (res.statusCode === 404) {
    return null;
  }
  const content = (await bufferStream(res)).toString('utf-8');

  log.error(
    'Error fetching tarball for %s@%s (status: %s)',
    packageName,
    version,
    res.statusCode
  );
  log.error(content);

  return null;
}

export async function resolveVersion(
  packageName: string,
  range: string,
  log: typeof console
) {
  const versionsAndTags = await getVersionsAndTags(packageName, log);

  if (versionsAndTags) {
    const { versions, tags } = versionsAndTags;

    if (range in tags) {
      range = tags[range];
    }

    return versions.includes(range)
      ? range
      : semver.maxSatisfying<string>(versions, range);
  }

  return null;
}

/**
 * Search the given tarball for entries that match the given name.
 * Follows node's resolution algorithm.
 * https://nodejs.org/api/modules.html#modules_all_together
 */
export function searchEntries(stream: Transform, filename: string) {
  // filename = /some/file/name.js or /some/dir/name
  type SearchResult = {
    foundEntry: {
      name?: string;
      path?: string;
      type?: tar.Headers['type'];
      contentType?: string;
      integrity?: string;
      lastModified?: string;
      size?: number;
      content?: any;
    };
    matchingEntries: Record<
      string,
      {
        path?: string;
        name?: string;
        type?: tar.Headers['type'];
      }
    >;
  };
  return new Promise<SearchResult>((accept, reject) => {
    const jsEntryFilename = `${filename}.js`;
    const jsonEntryFilename = `${filename}.json`;

    const matchingEntries: SearchResult['matchingEntries'] = {};
    let foundEntry: SearchResult['foundEntry'];

    if (filename === '/') {
      foundEntry = matchingEntries['/'] = { name: '/', type: 'directory' };
    }

    stream
      .pipe(tar.extract())
      .on('error', reject)
      .on('entry', async (header, stream, next) => {
        const entry: SearchResult['foundEntry'] = {
          // Most packages have header names that look like `package/index.js`
          // so we shorten that to just `index.js` here. A few packages use a
          // prefix other than `package/`. e.g. the firebase package uses the
          // `firebase_npm/` prefix. So we just strip the first dir name.
          path: header.name.replace(/^[^/]+/g, ''),
          type: header.type
        };

        // Skip non-files and files that don't match the entryName.
        if (entry.type !== 'file' || !entry?.path?.startsWith(filename)) {
          stream.resume();
          stream.on('end', next);
          return;
        }

        matchingEntries[entry.path] = entry;

        // Dynamically create "directory" entries for all directories
        // that are in this file's path. Some tarballs omit these entries
        // for some reason, so this is the "brute force" method.
        let dir = path.dirname(entry.path);
        while (dir !== '/') {
          if (!matchingEntries[dir]) {
            matchingEntries[dir] = { name: dir, type: 'directory' };
          }
          dir = path.dirname(dir);
        }

        if (
          entry.path === filename ||
          // Allow accessing e.g. `/index.js` or `/index.json`
          // using `/index` for compatibility with npm
          entry.path === jsEntryFilename ||
          entry.path === jsonEntryFilename
        ) {
          if (foundEntry) {
            if (
              foundEntry.path !== filename &&
              (entry.path === filename ||
                (entry.path === jsEntryFilename &&
                  foundEntry.path === jsonEntryFilename))
            ) {
              // This entry is higher priority than the one
              // we already found. Replace it.
              delete foundEntry.content;
              foundEntry = entry;
            }
          } else {
            foundEntry = entry;
          }
        }

        try {
          const content = await bufferStream(stream);

          entry.contentType = getContentType(entry.path);
          entry.integrity = getIntegrity(content);
          entry.lastModified = header.mtime!.toUTCString();
          entry.size = content.length;

          // Set the content only for the foundEntry and
          // discard the buffer for all others.
          if (entry === foundEntry) {
            entry.content = content;
          }

          next();
        } catch (error) {
          next(error);
        }
      })
      .on('finish', () => {
        accept({
          // If we didn't find a matching file entry,
          // try a directory entry with the same name.
          foundEntry: foundEntry || matchingEntries[filename] || null,
          matchingEntries: matchingEntries
        });
      });
  });
}
