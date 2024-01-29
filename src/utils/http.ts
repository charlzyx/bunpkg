import { IncomingMessage } from "http";
import https, { RequestOptions } from "https";
import http from "http";
import { LRUCache } from "lru-cache";
import { BunPkgConfig } from "../config";
import { SIZE, TTL } from "./helper";

const agent = new https.Agent({
  keepAlive: true,
});

export const httpCache = new LRUCache<string, string>({
  max: 1000,
  ttl: TTL.SECONDS(5),
  sizeCalculation: (value) => Buffer.byteLength(value as any) || 1,
  maxSize: SIZE.Gb(1),
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
        resolve,
      )
      .on("error", reject);
  });
};
export const get = (options: RequestOptions) => {
  const conKey = options.host! + options.path;
  const maybe = conMap[conKey];
  if (maybe) {
    return maybe;
  } else {
    const p = new Promise<IncomingMessage>((resolve, reject) => {
      https
        .get(
          {
            agent,
            ...options,
            headers: {
              ...options?.headers,
              Authorization:
                options?.headers?.authorization ||
                `Bearer ${BunPkgConfig.npmAuthToken}`,
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
