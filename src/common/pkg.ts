import validateNpmPackageName from "validate-npm-package-name";
import { err } from "./err";

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
    throw err("PathParser", "Decode", `when decode (${pathname}) ${error}`);
  }

  const match = helper.packagePathnameFormat.exec(pathname);

  if (match == null) {
    throw err("PathParser", "Validate", "invalid package name", pathname);
  }

  const [_, name, version = "latest", filename = ""] = match;

  if (helper.isHash(name)) {
    throw err(
      "PathParser",
      "Validate",
      `package name ${name} can not be a hash, pathname ${pathname}`,
    );
  }

  const maybe = validateNpmPackageName(name).errors;

  if (maybe) {
    throw err("PathParser", "Validate", `${maybe.join(", ")}`);
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

export const cleanPkgConfig = (config: Record<string, string>) => {
  return Object.keys(config).reduce<typeof config>((memo, key) => {
    if (!key.startsWith("_") && !helper.IGNORE_KEYS[key]) {
      memo[key] = config[key];
    }
    return memo;
  }, {});
};
