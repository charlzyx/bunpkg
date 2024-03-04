import { BunFile } from "bun";
import path from "path";
import mime from "mime";
import { parseTar } from "nanotar";

export const tgzReader = async (filename: BunFile | string | undefined) => {
  const file = typeof filename === "string" ? Bun.file(filename) : filename;
  if (!file || !(await file.exists())) {
    throw new Error(`tgzReader:: File Not Exist. ${filename}`);
  }
  if (typeof filename === "string" && !/\.tgz$/.test(filename)) {
    throw new Error(`tgzReader:: Unsupported File Type. ${filename}`);
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
  console.log(`🚀 ~ algoithms:`, algoithms);
  return algoithms
    .map((algoithm) => {
      const hash = new Bun.CryptoHasher(algoithm)
        .update(data, "utf-8")
        .digest("base64");
      return `${algoithm}-${hash}`;
    })
    .join(delimiter);
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
  const name = path.basename(filename);

  return textFiles.test(name)
    ? "text/plain"
    : mime.getType(name) || "text/plain";
};
