import path from "path";
import { LRUCache } from "lru-cache";
import { TTL, SIZE } from "./helper";
import { BunPkgConfig } from "../config";
import { IFileMeta } from "./content";
import { unlink } from "node:fs";

const fileCacher = new LRUCache<
  string,
  {
    file: string;
    meta: IFileMeta;
  }
>({
  max: 1000,
  ttl: TTL.MINUTES(5),
  sizeCalculation: (value) => value.meta.size || 1,
  maxSize: SIZE.Gb(10),
  disposeAfter: (item, key) => {
    unlink(item.file, () => {});
  },
});

const tgzCacher = new LRUCache<
  string,
  {
    file: string;
    meta: IFileMeta;
  }
>({
  max: 1000,
  ttl: TTL.MINUTES(5),
  sizeCalculation: (value) => value.meta.size || 1,
  maxSize: SIZE.Gb(10),
  disposeAfter: (item, key) => {
    unlink(item.file, () => {});
  },
});

export const diskFactory = (
  cacher: typeof fileCacher | typeof tgzCacher,
  cachdDir: string,
) => {
  return {
    read: async (cacheKey: string) => {
      const maybe = cacher.get(cacheKey);
      if (maybe) {
        const file = Bun.file(maybe.file);
        const exists = await file.exists();
        if (exists) {
          return {
            file: file,
            meta: maybe.meta,
          };
        } else {
          return null;
        }
      } else {
        return null;
      }
    },
    write(
      pathname: string,
      file: Parameters<typeof Bun.write>[1],
      meta?: IFileMeta,
    ) {
      const cachefile = path.join(cachdDir, pathname);
      cacher.set(pathname, {
        file: cachefile,
        meta: {},
      });
      Bun.write(cachefile, file).then((size) => {
        if (meta) return;
        cacher.set(pathname, {
          file: cachefile,
          meta: {
            size,
          },
        });
      });
    },
  };
};

export const fileCache = diskFactory(fileCacher, BunPkgConfig.cacheDir);
export const tgzCache = diskFactory(tgzCacher, BunPkgConfig.tgzCacheDir);
