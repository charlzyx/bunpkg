import { parseTar } from "nanotar";

export const tgzReader = async (filename: string) => {
  const file = Bun.file(filename);
  if (!(await file.exists())) {
    throw new Error(`tgzReader:: File Not Exist. ${filename}`);
  }
  if (!/\.tgz$/.test(filename)) {
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
const integrity = (data: string) => {
  const hash = new Bun.CryptoHasher("sha384")
    .update(data, "utf-8")
    .digest("base64");
  return `sha384-${hash}`;
};
