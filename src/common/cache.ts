import { unlink } from "node:fs";
import { SqliteLRUCache } from "./sqlite-lru-cache";
import { BunPkgConfig } from "../config";
import path from "path";
import { LRUCache } from "lru-cache";
import { BunFile } from "bun";
import { serialize, deserialize } from "v8";

const database = path.join(BunPkgConfig.cacheDir, `cache.sqlite`);

const sqlite = new SqliteLRUCache<{
  file_path?: string;
  file?: BunFile;
  meta?: any;
}>({
  database,
  /**  4Gib */
  maxByteSize: 4 * Math.pow(2, 30),
  /** 10W */
  maxLen: 10 * Math.pow(10, 4),
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
      const filepath = path.join(BunPkgConfig.cacheDir, "file", key);
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
          throw new Error(
            `File Write Error, size not match ${filepath}, except ${meta.size}, recived ${size} `,
          );
        }
      });
      return tasks[filepath];
    }
  },
};

export const memoLRU = new LRUCache<string, any>({
  max: 1000,
  // 1min
  ttl: 1000 * 60,
  sizeCalculation: (value) => {
    return Buffer.byteLength(value as any) || 1;
  },
  // 1 Gib
  maxSize: 1 * Math.pow(2, 30),
});

export const memoCache = {
  has(k: string) {
    return memoLRU.has(k);
  },
  set(k: string, v: any) {
    return memoLRU.set(k, serialize(v));
  },
  get(k: string) {
    return deserialize(memoLRU.get(k));
  },
};
