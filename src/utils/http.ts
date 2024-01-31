import { IncomingMessage } from "http";
import https, { RequestOptions } from "https";
import http from "http";
import { LRUCache } from "lru-cache";
import { BunPkgConfig } from "../config";
import { SIZE, TTL } from "./helper";
import { URL } from "whatwg-url";

const agent = new https.Agent({
  keepAlive: true,
});

export const httpCache = new LRUCache<string, string>({
  max: 1000,
  ttl: TTL.SECONDS(5),
  sizeCalculation: (value) => Buffer.byteLength(value as any) || 1,
  maxSize: SIZE.Gib(1),
});

// is stream can shared ?
const conMap = {} as Record<string, Promise<IncomingMessage> | void>;

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
          console.log("🚀 ~ tgz ~ res:", name);
          return resolve(res);
        },
      )
      .on("error", (error) => {
        console.log("🚀 ~ ).on ~tgz error:", error);
        reject(error);
      });
  });
};
export const get = (url: string) => {
  const { hostname, pathname, protocol, port } = new URL(url);
  const conKey = hostname! + pathname;
  const maybe = conMap[conKey];
  if (maybe) {
    return maybe;
  } else {
    const p = new Promise<IncomingMessage>((resolve, reject) => {
      const exec = /https/.test(protocol) ? https : http;
      exec
        .get(
          {
            agent,
            path: pathname,
            hostname,
            port: port,
            headers: {
              Authorization: `Bearer ${BunPkgConfig.npmAuthToken}`,
            },
          },
          resolve,
        )
        .on("error", reject);
    }).finally(() => {
      conMap[conKey] = null!;
    });
    conMap[conKey] = p;
    return p;
  }
};
