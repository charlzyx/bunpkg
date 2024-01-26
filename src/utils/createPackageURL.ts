import createSearch from './createSearch';

export default function createPackageURL(
  packageName: string,
  packageVersion: string,
  filename: string,
  query: Record<string, string | undefined>
) {
  let url = `/${packageName}`;

  if (packageVersion) url += `@${packageVersion}`;
  if (filename) url += filename;
  if (query) url += createSearch(query);

  return url;
}
