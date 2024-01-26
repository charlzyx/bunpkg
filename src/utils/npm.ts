import url from 'url';
import https, { RequestOptions } from 'https';
import type { IncomingMessage } from 'http';
import gunzip from 'gunzip-maybe';
import { LRUCache } from 'lru-cache';
import semver from 'semver';

import bufferStream from './bufferStream';

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
) {
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
  const tarballURL = pkgConfig.dist
    ? pkgConfig.dist.tarball
    : `${npmRegistryURL}/${packageName}/-/${tarballName}-${version}.tgz`;

  log.debug('Fetching package for %s from %s', packageName, tarballURL);

  // return fetch(tarballURL)

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

  const content = await bufferStream(res);

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
