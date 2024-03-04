import { TarFileItem } from "nanotar";
import path from "path";
import { sqliteCache } from "../common/cache";
import { fetchPackageInfo } from "../common/fetch";

export type IFileMeta = {
  name?: string;
  contentType?: string;
  integrity?: string;
  lastModified?: string;
  size?: number;
};

export const qs = (query: Record<string, string | undefined>) => {
  const keys = Object.keys(query).sort();
  const pairs = keys.reduce<string[]>(
    (memo, key) =>
      memo.concat(
        query[key] == null || query[key] === ""
          ? key
          : `${key}=${encodeURIComponent(query[key] ?? "")}`,
      ),
    [],
  );

  return pairs.length ? `?${pairs.join("&")}` : "";
};

export const appendMetaHeaders = (resp: Response, meta: IFileMeta) => {
  const tags = ["file"];

  const ext = path.extname(meta.name ?? "").replace(".", "");

  if (ext) {
    tags.push(`${ext}-file`);
  }
  if (meta.integrity) {
    tags.push(meta.integrity);
  }

  resp.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  resp.headers.set("Content-Type", meta.contentType!);
  resp.headers.set("Content-Length", meta.size?.toString()!);
  resp.headers.set("Cache-Control", "public, max-age=31536000");
  resp.headers.set("Last-Modified", meta.lastModified!);
  resp.headers.set("ETag", tags.join(","));
};

export const getPkgInfo = async (packageName: string) => {
  const cacheKey = `pacakge-info${packageName}`;
  const cached = await sqliteCache.read(cacheKey);
  if (cached) {
    return cached;
  }

  return fetchPackageInfo(packageName).then((info) => {
    // expire in 60s
    sqliteCache.write(cacheKey, info, Date.now() + 1000 * 60);
    return info;
  });
};

export const simpleMeta = (x: TarFileItem) => {
  return { name: x.name, lastModified: x.attrs?.mtime! };
};
