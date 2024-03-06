import { resolve, semver, version } from "bun";
import validateNpmPackageName from "validate-npm-package-name";
import { BunPkgConfig } from "../config.final";
import { unlink } from "node:fs";
import { IFileMeta } from "../features/utils";
import { memoCache, sqliteCache } from "./cache";
import { markError } from "./err";
import { fetchPackageInfo, fetchPackageTarball } from "./fetch";
import { getContentType, getIntegrityBy, tgzReader } from "./file";
import { TarFileItem } from "nanotar";

const helper = {
  packagePathnameFormat: /^\/((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/,
  hexValue: /^[a-f0-9]+$/i,
  isHash(value: string) {
    return value?.length === 32 && helper.hexValue.test(value ?? "");
  },
  IGNORE_KEYS: {
    browserify: true,
    bugs: true,
    directories: true,
    engines: true,
    files: true,
    homepage: true,
    keywords: true,
    maintainers: true,
    scripts: true,
  } as Record<string, boolean>,
};

export const parsePkgByPathname = (pathname: string) => {
  try {
    pathname = decodeURIComponent(pathname);
  } catch (error) {
    throw markError(
      "ParseError",
      "PathParser",
      "Decode",
      `when decode (${pathname}) ${error}`,
    );
  }

  const match = helper.packagePathnameFormat.exec(pathname);

  if (match == null) {
    throw markError(
      "PathValidationError",
      "PathParser",
      "Validate",
      "invalid package name",
      pathname,
    );
  }

  const [_, name, version = "latest", filename = ""] = match;

  if (helper.isHash(name)) {
    throw markError(
      "PathValidationError",
      "PathParser",
      "Validate",
      `package name ${name} can not be a hash, pathname ${pathname}`,
    );
  }

  const maybe = validateNpmPackageName(name).errors;

  if (maybe) {
    throw markError(
      "PathValidationError",
      "PathParser",
      "Validate",
      `${maybe.join(", ")}`,
    );
  }

  const info = {
    pkgName: name,
    pkgVersion: version,
    pkgSpec: `${name}@${version}`,
    filename: filename.replace(/\/\/+/g, "/"),
  };

  return info;
};

export const isScopedPkgName = (packageName: string) => {
  return packageName.startsWith("@");
};

export const encodePkgName = (packageName: string) => {
  return isScopedPkgName(packageName)
    ? `@${encodeURIComponent(packageName.substring(1))}`
    : encodeURIComponent(packageName);
};

export const resolveVersion = (
  pkg: ReturnType<typeof parsePkgByPathname>,
  versionsAndTags?: any,
) => {
  let range = pkg.pkgVersion;

  const cacheKey = `resolve-version-of-${pkg.pkgName}-${range}`;
  if (memoCache.has(cacheKey)) {
    memoCache.get(cacheKey);
  }
  if (!versionsAndTags) {
    throw markError(
      "NotFoundError",
      "Resolve",
      "Package Version",
      "No Package Info on Upstream",
    );
  }
  const versions = Object.keys(versionsAndTags?.versions || {});
  const tags = versionsAndTags?.["dist-tags"] || versionsAndTags?.tags;
  if (range in tags) {
    range = tags[range];
  }

  if (!versions.includes(range)) {
    // get max satisfies
    versions.sort(semver.order);
    range = versions.findLast((ver: string) => semver.satisfies(ver, range))!;
  }
  memoCache.set(cacheKey, range);
  return range;
};

// https://www.jsdelivr.com/documentation#id-configuring-a-default-file-in-packagejson
const entries = ["bunpkg", "unpkg", "jsdelivr", "browser", "main"];

const findEntry = (pkg: any) => {
  const ret = entries.find((x) => {
    return pkg[x] && typeof pkg[x] === "string";
  });
  return ret;
};

export const findIndex = (
  packageJson: any,
  options: {
    esm?: boolean;
    main?: string;
  },
) => {
  let filename = "/index.js";
  // esm entry
  if (options.esm) {
    // See https://github.com/rollup/rollup/wiki/pkg.module
    filename = packageJson.module || packageJson["jsnext:main"];
    if (!filename) {
      // https://nodejs.org/api/esm.html#esm_code_package_json_code_code_type_code_field
      // Or use .mjs file in package.main
      if (packageJson.type === "module" || /\.mjs$/.test(packageJson.main)) {
        filename = packageJson.main;
      }
    }
  } // not esm
  else if (options.main && typeof packageJson?.[options.main]) {
    // 给定 main
    filename = packageJson[options.main];
  } else if (
    findEntry(packageJson)
    // entries.find((x) => packageJson[x] && packageJson[x] === "string")
  ) {
    filename = packageJson?.[findEntry(packageJson) as any];
  }
  filename = filename || "/index.js";

  return filename.replace(/^[./]*/, "/");
};

export const cleanPkgConfig = (config: Record<string, string>) => {
  return Object.keys(config).reduce<typeof config>((memo, key) => {
    if (!key.startsWith("_") && !helper.IGNORE_KEYS[key]) {
      memo[key] = config[key];
    }
    return memo;
  }, {});
};

export const getConfigOfVersion = async (
  pkg: ReturnType<typeof parsePkgByPathname>,
  remote?: any,
) => {
  const version = pkg.pkgVersion;
  const cacheKey = `config-of-version-${pkg.pkgName}-${version}`;
  if (memoCache.has(cacheKey)) {
    return memoCache.get(cacheKey);
  }

  const info = remote ?? (await queryPkgInfo(pkg.pkgName));
  const value =
    info?.versions && version in info.versions
      ? cleanPkgConfig(info.versions[version])
      : null;
  memoCache.set(cacheKey, value);
  return value;
};

export const getTarballOfVersion = async (
  pkg: ReturnType<typeof parsePkgByPathname>,
) => {
  const pkgConfig = await getConfigOfVersion(pkg);
  const npmRegistryURL = BunPkgConfig.npm.registry;
  const tarballName = isScopedPkgName(pkg.pkgName)
    ? pkg.pkgName.split("/")[1]
    : pkg.pkgName;
  const tgzName = `${tarballName}-${pkg.pkgVersion}.tgz`;

  const tgzURL = pkgConfig?.dist
    ? pkgConfig?.dist?.tarball
    : `${npmRegistryURL}/${pkg.pkgName}/-/${tarballName}-${pkg.pkgVersion}.tgz`;

  return [tgzName, tgzURL, pkgConfig?.dist];
};

export const queryMetaList = async (
  pkg: ReturnType<typeof parsePkgByPathname>,
): Promise<TarFileItem[]> => {
  const [tgzName, tgzUrl, distInfo] = await getTarballOfVersion(pkg);
  const has = await sqliteCache.read(tgzName);
  if (!has) {
    const upstram = await fetchPackageTarball(tgzUrl);

    const [saveTo, file] = await sqliteCache.write(tgzName, {}, 0, upstram);

    if (distInfo?.integrity) {
      // tgz 签名验证
      const buffer = await file?.arrayBuffer();
      const algo = distInfo?.integrity?.split("-")?.[0];
      const integrity = getIntegrityBy(buffer!, algo ? [algo] : algo);

      if (integrity !== distInfo.integrity) {
        // 签名验证失败删除文件
        unlink(saveTo, () => {});
        throw markError(
          "InternalServerError",
          "File Check",
          "integrity Check Bad",
          `excpet ${distInfo.integrity}, received ${integrity}`,
        );
      }
    }
    return queryMetaList(pkg);
  }
  const fileList = await tgzReader(has.file);
  return fileList;
};

export const resolveTgz = async (
  pkg: ReturnType<typeof parsePkgByPathname>,
  cacheKey?: string,
): Promise<[Uint8Array, IFileMeta]> => {
  const [tgzName] = await getTarballOfVersion(pkg);
  const fileList = await queryMetaList(pkg);
  const file = fileList.find((x) => x.name === `package${pkg.filename}`);
  if (!file) {
    throw markError("NotFoundError", "File Not Found", `in ${tgzName}`);
  } else {
    const meta: IFileMeta = {
      contentType: getContentType(pkg.filename),
      lastModified: file.attrs?.mtime as any,
      size: (file as any).size,
      name: file.name,
    };
    if (cacheKey) {
      await sqliteCache.write(cacheKey, meta, 0, file.data);
    }
    return [file.data!, meta] as const;
  }
};

export const queryPkgInfo = async (packageName: string) => {
  const cacheKey = `pacakge-info${packageName}`;
  const cached = await sqliteCache.read(cacheKey);
  if (cached) {
    return cached;
  }

  return fetchPackageInfo(packageName).then((info) => {
    // expire in 60s
    sqliteCache.write(cacheKey, info, Date.now() + 1000 * 60);
    return info;
  });
};
