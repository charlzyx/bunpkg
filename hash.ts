// integrity: "sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGQ==",
// shasum: "555bd98592883255fa00de14f1151a917b5d77d5",
// tarball: "https://registry.npmmirror.com/react/-/react-18.2.0.tgz",

const file = Bun.file("./.cache/file/react-18.2.0.tgz");
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
const hasher = async () => {
  const buffer = await file.arrayBuffer();
  const hash = new Bun.CryptoHasher("sha512")
    .update(buffer, "utf-8")
    .digest("base64");
  console.log(hash);
  console.log(getIntegrityBy(buffer, ["sha512"]));
};

hasher();
