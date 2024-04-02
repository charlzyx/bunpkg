import { unlink } from "node:fs";
import { SqliteLRUCache } from "./sqlite-lru-cache";
import { BunPkgConfig } from "../config.final";
import path from "node:path";
import { LRUCache } from "lru-cache";
import type { BunFile } from "bun";
import { serialize } from "node:v8";
import { markError } from "./err";

const database = path.join(BunPkgConfig.cache.dir, `cache.sqlite`);

const sqlite = new SqliteLRUCache<{
  file_path?: string;
  file?: BunFile;
  meta?: any;
}>({
  database,
  /**  4Gib */
  maxByteSize: BunPkgConfig.cache.maxSize * Math.pow(2, 30),
  /** 8W */
  maxLen: 8 * 10000,
  onRemove(items, reason) {
    items.forEach((item) => {
      if (item?.meta?.file_path) {
        unlink(item.meta.file_path, () => {});
      }
    });
  },
});
const tasks: Record<string, Promise<any>> = {};

export const sqliteCache = {
  purge(key: string, wild?: boolean) {
    sqlite.purge(key, wild);
  },
  async read(key: string) {
    const meta = sqlite.get(key)?.meta;
    const maybe = meta?.file_path;
    if (maybe) {
      const file = Bun.file(maybe);
      const exists = await file.exists();
      if (exists) {
        return {
          file,
          meta,
        };
      } else {
        return null;
      }
    } else {
      return meta;
    }
  },
  async write(
    key: string,
    meta: any,
    expire?: number,
    content?:
      | Blob
      | NodeJS.TypedArray
      | ArrayBufferLike
      | string
      | Bun.BlobPart[],
  ) {
    if (!content) {
      sqlite.set({
        key,
        meta,
        expire,
      });
    } else {
      const filepath = path.join(BunPkgConfig.cache.dir, "files", key);
      if (filepath in tasks) return tasks[filepath];
      tasks[filepath] = Bun.write(filepath, content).then((size) => {
        sqlite.set({
          key,
          bytesize: size,
          meta: {
            ...meta,
            file_path: filepath,
          },
        });
        delete tasks[filepath];
        // size checking
        if (meta.size && meta.size !== size) {
          unlink(filepath, () => {});
          throw markError(
            "InternalServerError",
            "Sqlite Cache",
            "File Write Failed, Case by",
            "File Size Not Match",
            `${filepath} except ${meta.size}, recived ${size} `,
          );
        }
        return [filepath, Bun.file(filepath)] as const;
      });
      return tasks[filepath];
    }
  },
};

export const memoLRU = new LRUCache<string, any>({
  max: 2000,
  // 5min
  ttl: 5000 * 60,
  sizeCalculation: (value) => {
    const len = Buffer.byteLength(serialize(value)) || 1;
    return len;
  },
  // 1 Gib
  maxSize: Math.pow(2, 30),
});

export const memoCache = {
  has(k: string) {
    return memoLRU.has(k);
  },
  set(k: string, v: any) {
    return memoLRU.set(k, v);
  },
  get(k: string) {
    return memoLRU.get(k);
  },
};
