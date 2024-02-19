import path from "path";
import { SIZE } from "./helper";
import { BunPkgConfig } from "../config";
import { IFileMeta } from "./content";
import { unlink } from "node:fs";
import { SqliteLRUCache } from "./sqlite-lru-cache";

const writeTasks: Record<string, Promise<any>> = {};

export const cacheFactory = ({
  name,
  maxGib: bytesizeLimit = 1,
}: {
  name: string;
  /** Gib */
  maxGib?: number;
}) => {
  const sqlite = new SqliteLRUCache<{
    file_path: string;
  }>({
    database: path.join(BunPkgConfig.cacheDir, `cache-${name}.sqlite`),
    maxByteSize: SIZE.Gib(bytesizeLimit),
    maxLen: 10 * 10000,
    onRemove(items) {
      items.forEach(({ meta }) => {
        if (meta) {
          unlink(meta.file_path, () => {});
        }
      });
    },
  });

  const helper = {
    async read(key: string) {
      const meta = sqlite.get(key)?.meta;
      const maybe = meta?.file_path;
      if (maybe) {
        const file = Bun.file(maybe);
        const exists = await file.exists();
        if (exists) {
          return {
            file: file,
            meta: meta,
          };
        } else {
          return null;
        }
      }
    },
    write(
      pathname: string,
      file: Parameters<typeof Bun.write>[1],
      meta?: IFileMeta,
    ) {
      const filePath = path.join(BunPkgConfig.cacheDir, name, pathname);
      file;

      if (filePath in writeTasks) return writeTasks[filePath];
      writeTasks[filePath] = Bun.write(filePath, file).then((size) => {
        sqlite.set({
          key: pathname,
          bytesize: size,
          meta: {
            ...meta,
            file_path: filePath,
          },
        });
        delete writeTasks[filePath];

        if (meta?.size && meta.size !== size) {
          unlink(filePath, () => {});
          throw new Error(`Size Error will write file ${filePath}`);
        }
      });
      return writeTasks[filePath];
    },
  };

  return helper;
};

export const SqliteCache = {
  tgz: cacheFactory({ name: "tgz", maxGib: BunPkgConfig.cacheSize * 0.5 }),
  file: cacheFactory({ name: "file", maxGib: BunPkgConfig.cacheSize * 0.5 }),
};
