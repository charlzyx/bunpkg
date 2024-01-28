import path from "path";
import { LRUCache } from "lru-cache";
import { TTL, SIZE } from "./helper";
import { BunPkgConfig } from "../config";
import { IFileMeta } from "./content";

const diskCache = new LRUCache<
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
});

const normalizePathname = (pathname: string) => {
  return pathname.replace(/\//g, "_").replace(/\@/g, "_at_");
};

export const disk = {
  read: async (pathname: string) => {
    const maybe = diskCache.get(pathname);
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
    meta: IFileMeta,
  ) {
    const cachefile = path.resolve(
      BunPkgConfig.cacheDir,
      normalizePathname(pathname),
    );
    diskCache.set(pathname, {
      file: cachefile,
      meta,
    });
    Bun.write(cachefile, file);
  },
};
