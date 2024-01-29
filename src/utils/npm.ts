import semver from "semver";
import { URL } from "whatwg-url";
import { BunPkgConfig } from "../config";
import {
  TTL,
  cleanPackageConfig,
  encodePackageName,
  isScopedPackageName,
} from "./helper";
import { get, httpCache } from "./http";
import type { IncomingMessage } from "http";
import { disk } from "./disk";
import {
  findEntryInEntries,
  findMatchEntries,
  findMatchEntry,
  promiseifyStream,
  search,
} from "./stream";

const NOT_FOUND = "";

const cacheYou = (cacheKey: string) => {
  const cacheValue = httpCache.get(cacheKey);
  if (cacheValue != null) {
    return cacheValue === NOT_FOUND ? null : JSON.parse(cacheValue);
  }
  return null;
};

const queryPackageInfo = async (packageName: string) => {
  const cacheKey = `pkg-info-${packageName}`;
  const cached = cacheYou(cacheKey);
  if (cached) return cached;

  const npmRegistryURL = BunPkgConfig.npmRegistryURL;

  const name = encodePackageName(packageName);
  const infoURL = `${npmRegistryURL}/${name}`;

  console.debug("Fetching package info for %s from %s", packageName, infoURL);

  const { hostname, pathname } = new URL(infoURL);

  const res = await get({
    hostname,
    path: pathname,
    headers: {
      Accept: "application/json",
    },
  });

  if (res.statusCode === 200) {
    return promiseifyStream(res).then((value) => {
      httpCache.set(cacheKey, value, { ttl: TTL.MINUTES(1) });
      return JSON.parse(value);
    });
  }

  if (res.statusCode === 400) {
    httpCache.set(cacheKey, NOT_FOUND, { ttl: TTL.MINUTES(5) });
  }

  const reason = `Error fetching info for ${packageName} (status: ${res.statusCode}`;

  console.error(reason);
  // const content = (await promiseifyStream(res)).toString('utf-8');
  // console.log(content)

  return null;
};

/**
 * Returns an object of available { versions, tags }.
 * Uses a cache to avoid over-fetching from the registry.
 */
const queryVersionsAndTags = async (packageName: string) => {
  const cacheKey = `versions-${packageName}`;
  const cached = cacheYou(cacheKey);
  if (cached) return cached;

  const info = await queryPackageInfo(packageName);

  const value = info?.versions
    ? {
        versions: Object.keys(info.versions),
        tags: info["dist-tags"],
      }
    : null;

  if (value == null) {
    httpCache.set(cacheKey, NOT_FOUND, { ttl: TTL.MINUTES(5) });
    return null;
  }

  httpCache.set(cacheKey, JSON.stringify(value), { ttl: TTL.MINUTES(1) });
  return value;
};

export const queryPackageConfigOfVersion = async (
  packageName: string,
  version: string,
) => {
  const cacheKey = `config-${packageName}-${version}`;
  const cached = cacheYou(cacheKey);
  if (cached) return cached;

  const info = await queryPackageInfo(packageName);

  const value =
    info?.versions && version in info.versions
      ? cleanPackageConfig(info.versions[version])
      : null;

  if (value == null) {
    httpCache.set(cacheKey, NOT_FOUND, { ttl: TTL.MINUTES(5) });
    return null;
  }

  httpCache.set(cacheKey, JSON.stringify(value), { ttl: TTL.MINUTES(1) });
  return value;
};

export const queryResolveVersion = async (
  packageName: string,
  range: string,
) => {
  const versionsAndTags = await queryVersionsAndTags(packageName);

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
};

/**
 * Returns a stream of the tarball'd contents of the given package.
 */
export const queryPackageTarball = async (
  packageName: string,
  version: string,
) => {
  const tarballName = isScopedPackageName(packageName)
    ? packageName.split("/")[1]
    : packageName;
  const pkgConfig = await queryPackageConfigOfVersion(packageName, version);
  const npmRegistryURL = BunPkgConfig.npmRegistryURL;
  const tarballURL = pkgConfig?.dist
    ? pkgConfig?.dist?.tarball
    : `${npmRegistryURL}/${packageName}/-/${tarballName}-${version}.tgz`;

  let reason = null;
  const got = async (tarballURL: string): Promise<IncomingMessage> => {
    console.debug("Fetching package for %s from %s", packageName, tarballURL);

    const { hostname, pathname } = new URL(tarballURL);

    const res = await get({
      hostname,
      path: pathname,
    });

    if (res.statusCode === 200) {
      return res;
    }

    if (res.statusCode === 404) {
      reason = `Not Found tarball for ${packageName}, version : ${version} (status: ${res.statusCode})`;

      throw new Error(reason);
    }

    if (res.statusCode === 302) {
      return got(res.headers.location!);
    }

    reason = `Error fetching tarball for ${packageName}, version : ${version} (status: ${res?.statusCode})`;

    throw new Error(reason);
  };

  const res = await got(tarballURL);
  return res;
};

export const searchPackageEntry = async (
  packageName: string,
  packageVersion: string,
  filename: string,
  meta?: boolean,
) => {
  const tarball = await queryPackageTarball(packageName, packageVersion);

  const result = await search(tarball!, filename);

  const { foundEntry: entry, matchingEntries: entries } = result;

  if (meta) {
    return { entry, entries };
  }

  if (!entry) {
    throw new Error(
      `Cannot find entry ${filename} in ${packageName}@${packageVersion}`,
    );
  }
  if (entry.type === "file" && entry.path !== filename) {
    filename = entry.path!;
  }

  if (entry.type === "directory") {
    // We need to redirect to some "index" file inside the directory so
    // our URLs work in a similar way to require("lib") in node where it
    // uses `lib/index.js` when `lib` is a directory.
    const indexEntry =
      entries[`${filename}/index.js`] || entries[`${filename}/index.json`];

    if (indexEntry && indexEntry.type === "file") {
      // Redirect to the index file so relative imports
      // resolve correctly.
      filename = indexEntry.path!;
    } else {
      throw new Error(
        `Cannot find an index in ${filename} in ${packageName}@${packageVersion}`,
      );
    }
  }

  return { filename, entry };
};

export const searchPackageEntryMeta = async (
  packageName: string,
  packageVersion: string,
  filename: string,
) => {
  const tarball = await queryPackageTarball(packageName, packageVersion);
  const isDir = /\/$/.test(filename);

  if (isDir) {
    filename = filename.slice(0, -1) || "/";
    const entries = await findMatchEntries(tarball, filename);
    const dir = findEntryInEntries(entries[filename], entries);
    return dir;
  } else {
    const entry = await findMatchEntry(tarball, filename);
    if (entry) {
      return entry;
    }
  }
};
