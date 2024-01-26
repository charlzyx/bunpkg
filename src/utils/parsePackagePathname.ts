const packagePathnameFormat = /^\/((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/;

export default function parsePackagePathname(pathname: string) {
  try {
    pathname = decodeURIComponent(pathname);
  } catch (error) {
    return null;
  }

  const match = packagePathnameFormat.exec(pathname);

  // Disallow invalid pathnames.
  if (match == null) return null;

  const packageName = match[1];
  const packageVersion = match[2] || 'latest';
  const filename = (match[3] || '').replace(/\/\/+/g, '/');

  return {
    // If the pathname is /@scope/name@version/file.js:
    packageName, // @scope/name
    packageVersion, // version
    packageSpec: `${packageName}@${packageVersion}`, // @scope/name@version
    filename // /file.js
  };
}

const hexValue = /^[a-f0-9]+$/i;

export function isHash(value: string) {
  return value.length === 32 && hexValue.test(value);
}
