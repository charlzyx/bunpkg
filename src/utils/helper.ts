import validateNpmPackageName from "validate-npm-package-name";

const packagePathnameFormat = /^\/((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/;
const hexValue = /^[a-f0-9]+$/i;

const isHash = (value: string) => {
  return value.length === 32 && hexValue.test(value);
};

export const parsePackageByPathname = (pathname: string) => {
  try {
    pathname = decodeURIComponent(pathname);
  } catch (error) {
    return [`decodeURI error: ${error?.toString()}`, null] as const;
  }

  const match = packagePathnameFormat.exec(pathname);

  // Disallow invalid pathnames.
  if (match == null) {
    return [`invalid pathnames ${pathname}`, null] as const;
  }

  const packageName = match[1];
  const packageVersion = match[2] || "latest";
  const filename = (match[3] || "").replace(/\/\/+/g, "/");

  let reason = null;

  if (isHash(packageName)) {
    reason = `Invalid package name "${packageName}" (cannot be a hash)`;
  }
  const errors = validateNpmPackageName(packageName).errors;
  if (errors) {
    const error = errors.join(", ");
    reason = `Invalid package name "${packageName}" (${error})`;
  }

  return [
    reason,
    {
      // If the pathname is /@scope/name@version/file.js:
      packageName, // @scope/name
      packageVersion, // version
      packageSpec: `${packageName}@${packageVersion}`, // @scope/name@version
      filename, // /file.js
    },
  ] as const;
};

export const isScopedPackageName = (packageName: string) => {
  return packageName.startsWith("@");
};

export const encodePackageName = (packageName: string) => {
  return isScopedPackageName(packageName)
    ? `@${encodeURIComponent(packageName.substring(1))}`
    : encodeURIComponent(packageName);
};
// All the keys that sometimes appear in package info
// docs that we don't need. There are probably more.
const IGNORE_KEYS = [
  "browserify",
  "bugs",
  "directories",
  "engines",
  "files",
  "homepage",
  "keywords",
  "maintainers",
  "scripts",
];

export const cleanPackageConfig = (config: Record<string, string>) => {
  return Object.keys(config).reduce<typeof config>((memo, key) => {
    if (!key.startsWith("_") && !IGNORE_KEYS.includes(key)) {
      memo[key] = config[key];
    }
    return memo;
  }, {});
};

export const TTL = {
  SECONDS: (x = 1) => 1000 * x,
  MINUTES: (x = 1) => 1000 * 60 * x,
};

export const SIZE = {
  Kib: (x = 1) => Math.pow(2, 10),
  Mib: (x = 1) => Math.pow(2, 20),
  Gib: (x = 1) => Math.pow(2, 30),
};
