import { IncomingMessage } from "http";
import https, { RequestOptions } from "https";
import http from "http";
import { LRUCache } from "lru-cache";
import { SIZE, TTL } from "./helper";
import { BunPkgConfig } from "../config";

const agent = new https.Agent({
  keepAlive: true,
});

export const httpCache = new LRUCache<string, string>({
  max: 1000,
  ttl: TTL.SECONDS(5),
  sizeCalculation: (value) => Buffer.byteLength(value as any) || 1,
  maxSize: SIZE.Gib(1),
});

const conMap = {} as Record<string, Promise<Response> | void>;

export const tgz = (name: string) => {
  return new Promise<IncomingMessage>((resolve, reject) => {
    return http
      .get(
        {
          hostname: "127.0.0.1",
          port: 45456,
          path: `/tgz/${name}`,
        },
        (res) => {
          return resolve(res);
        },
      )
      .on("error", (error) => {
        console.log("🚀 ~ ).on ~tgz error:", error);
        reject(error);
      });
  });
};

export const get = (url: string, json = true) => {
  const maybe = conMap[url];
  if (maybe) {
    // console.log("🚀 ~ 且慢 ~ maybe:", url);

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
        conMap[url] = null!;
      });
    conMap[url] = p;
    return p;
  }
};
