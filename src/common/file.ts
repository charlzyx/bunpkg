import type { BunFile } from "bun";
import path from "node:path";
import mime from "mime";
import { parseTar } from "nanotar";
import { markError } from "./err";

export const tgzReader = async (filename: BunFile | string | undefined) => {
  const file = typeof filename === "string" ? Bun.file(filename) : filename;
  if (!file || !(await file.exists())) {
    throw markError(
      "InternalServerError",
      `tgzReader`,
      `File Not Exist`,
      `${filename}`,
    );
  }
  if (typeof filename === "string" && !/\.tgz$/.test(filename)) {
    throw markError(
      "InternalServerError",
      `tgzReader`,
      `Only .tgz file supported`,
      `${filename}`,
    );
  }
  const buffer = await file.arrayBuffer();
  const decompressed = Bun.gunzipSync(buffer);
  const fileList = parseTar(decompressed);
  return fileList;
};

// make integrity simple, origin is
// return SRIToolbox.generate({ algorithms: ["sha384"] }, data);
// https://github.com/neftaly/npm-sri-toolbox/blob/master/generate.js#L33
export const getIntegrityBy = (
  data: ArrayBuffer,
  algoithms: (typeof Bun.CryptoHasher)["algorithms"] = ["sha512"],
  delimiter = " ",
) => {
  return algoithms
    .map((algoithm) => {
      try {
        const hash = new Bun.CryptoHasher(algoithm)
          .update(data, "utf-8")
          .digest("base64");
        return `${algoithm}-${hash}`;
      } catch (error) {
        throw markError(
          "InternalServerError",
          "getIntegrityBy",
          "CryptoHasher Error",
          `algoithm ${algoithm}`,
          error?.toString(),
        );
      }
    })
    .join(delimiter);
};

/**
 * @reference
 * -MDN: Common MIME types
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 * - Difference between application/x-javascript and text/javascript content types
 * https://stackoverflow.com/questions/9664282/difference-between-application-x-javascript-and-text-javascript-content-types
 * -  the MIME-Type of TypeScript?
 * https://stackoverflow.com/questions/13213787/whats-the-mime-type-of-typescript
 */

mime.define(
  {
    "text/plain": [
      "authors",
      "changes",
      "license",
      "makefile",
      "patents",
      "readme",
      "flow",
    ],
    "text/x-typescript": ["ts", "cts", "mts", "tsx"],
    // 虽然 deno 的是使用了 application/typescript ， 但是在浏览器中会认为是二进制下载
    // 考虑到我们是在浏览器中使用场景比较多， 就使用了  text/x-typescript 这个标记
    // "application/typescript": ["ts", "cts", "mts", "tsx"],
  },
  /* force */ true,
);

const textFiles = /\/?(\.[a-z]*rc|\.git[a-z]*|\.[a-z]*ignore|\.lock)$/i;

export const getContentType = (filename: string) => {
  const name = path.basename(filename);

  return textFiles.test(name)
    ? "text/plain"
    : mime.getType(name) || "text/plain";
};
