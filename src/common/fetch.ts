import { BunPkgConfig } from "../config";
import { err } from "./err";
import { encodePkgName } from "./pkg";

const rankMap = {} as Record<string, Promise<Response> | void>;

const get = (url: string, json = true) => {
  const maybe = rankMap[url];
  if (maybe) {
    return maybe;
  } else {
    const headers: Record<string, string> = {
      "User-Agent": "bunpkg",
    };
    if (BunPkgConfig.npmAuthToken) {
      headers.Authorization = `Bearer ${BunPkgConfig.npmAuthToken}`;
    }
    const p = fetch(url, {
      headers,
    })
      .then((resp) => (json ? resp.json() : resp))
      .finally(() => {
        rankMap[url] = null!;
      });
    rankMap[url] = p;
    return p;
  }
};

export const fetchPackageInfo = (packageName: string) => {
  // @see https://registry.npmmirror.com/jquery
  const infoUrl = `${BunPkgConfig.npmRegistryURL}/${encodePkgName(
    packageName,
  )}`;
  return get(infoUrl);
};

export const fetchPackageTarball = (tarballUrl: string) => {
  return get(tarballUrl, false);
};
