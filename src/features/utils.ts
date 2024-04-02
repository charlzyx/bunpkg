import type { TarFileItem } from "nanotar";
import path from "node:path";

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

export const simpleMeta = (x: TarFileItem) => {
  return {
    name: x.name,
    size: x.data?.byteLength,
    lastModified: x.attrs?.mtime!,
  };
};

export const queryHasKey = (query: Record<string, any>, key: string) => {
  return Object.hasOwn(query, key);
};
