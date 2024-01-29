import type { IncomingMessage } from "http";
import https, { RequestOptions } from "https";
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

export const get = (options: RequestOptions) => {
  const conKey = options.hostname! + options.path;
  const maybe = conMap[conKey];
  if (maybe) {
    return maybe;
  } else {
    const p = new Promise<IncomingMessage>((accept, reject) => {
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
          accept,
        )
        .on("error", reject);
    }).finally(() => {
      conMap[conKey] = null!;
    });
    conMap[conKey] = p;
    return p;
  }
};
