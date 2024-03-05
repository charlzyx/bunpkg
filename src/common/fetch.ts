import { BunPkgConfig } from "../config.final";
import { markError } from "./err";
import { encodePkgName } from "./pkg";

const rankMap = {} as Record<string, Promise<Response> | void>;

const get = (url: string, json = true) => {
  const maybe = rankMap[url];
  if (maybe) {
    return maybe;
  } else {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const headers: Record<string, string> = {
      "User-Agent": "bunpkg",
    };
    if (BunPkgConfig.npm.authToken) {
      headers.Authorization = `Bearer ${BunPkgConfig.npm.authToken}`;
    }
    const p = fetch(url, {
      headers,
      signal: controller.signal,
    })
      .then((resp) => (json ? resp.json() : resp))
      .catch((error) => {
        throw markError(
          "InternalServerError",
          "Upstream Request Failed ",
          url,
          error?.toString(),
        );
      })
      .finally(() => {
        rankMap[url] = null!;
        clearTimeout(timeoutId);
      });
    rankMap[url] = p;
    return p;
  }
};

export const fetchPackageInfo = (packageName: string) => {
  // @see https://registry.npmmirror.com/jquery
  const infoUrl = `${BunPkgConfig.npm.registry}/${encodePkgName(packageName)}`;
  return get(infoUrl);
};

const MAX_LIMIT = BunPkgConfig.npm.maxTgzSize * Math.pow(2, 20);

export const fetchPackageTarball = (tarballUrl: string) => {
  return get(tarballUrl, false).then((resp) => {
    const length = resp.headers["content-length"];
    const size = Number(length);
    if (!Number.isNaN(size) && size > MAX_LIMIT) {
      throw markError(
        "TarballSizeLimitedError",
        "Rejact case by tarball size too large",
        tarballUrl,
      );
    }
    return resp;
  });
};
