import { basename, extname } from "path";

import mime from "mime";
import SRIToolbox from "sri-toolbox";
import type tar from "tar-stream";

export type IFileMeta = {
  name?: string;
  path?: string;
  type?: tar.Headers["type"];
  contentType?: string;
  integrity?: string;
  lastModified?: string;
  size?: number;
  content?: any;
  // as dir
  files?: IFileMeta[];
};

mime.define(
  {
    "text/plain": [
      "authors",
      "changes",
      "license",
      "makefile",
      "patents",
      "readme",
      "ts",
      "flow",
    ],
  },
  /* force */ true,
);

const textFiles = /\/?(\.[a-z]*rc|\.git[a-z]*|\.[a-z]*ignore|\.lock)$/i;

export const getContentType = (filename: string) => {
  const name = basename(filename);

  return textFiles.test(name)
    ? "text/plain"
    : mime.getType(name) || "text/plain";
};

export const getContentTypeHeader = (type: string) => {
  return type === "application/javascript" ? `${type}; charset=utf-8` : type;
};

export const getIntegrity = (data: string) => {
  return SRIToolbox.generate({ algorithms: ["sha384"] }, data);
};

export const setMetaHeaders = (resp: Response, meta: IFileMeta) => {
  const tags = ["file"];

  const ext = extname(meta.path!).substr(1);
  if (ext) {
    tags.push(`${ext}-file`);
  }
  resp.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  resp.headers.set("Content-Type", getContentType(meta.contentType!));
  resp.headers.set("Content-Length", meta.size?.toString()!);
  resp.headers.set("Cache-Control", "public, max-age=31536000");
  resp.headers.set("Last-Modified", meta.lastModified!);
  resp.headers.set("ETag", tags.join(", "));
};

export const createSearch = (query: Record<string, string | undefined>) => {
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
