import validateNpmPackageName from 'validate-npm-package-name';

export default function isValidPackageName(packageName: string) {
  return validateNpmPackageName(packageName).errors == null;
}
