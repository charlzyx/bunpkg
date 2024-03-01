import { parseTar } from "nanotar";

const run = async () => {
  const file = Bun.file("./.cache/tgz/react-dom-16.7.0.tgz");
  const buffer = await file.arrayBuffer();
  const decompressed = Bun.gunzipSync(buffer);
  return parseTar(decompressed);
};

run().then((data) =>
  console.log(
    data.map((item) => {
      return {
        name: item.name,
        // type: item.type,
        type: item.type,
      };
    }),
  ),
);

/**
 * [
  {
    name: "package/package.json",
    type: "file",
  }, {
    name: "package/build-info.json",
    type: "file",
  }, {
    name: "package/index.js",
    type: "file",
  }, {
    name: "package/LICENSE",
    type: "file",
  }, {
    name: "package/profiling.js",
    type: "file",
  }, {
    name: "package/README.md",
    type: "file",
  }, {
    name: "package/server.browser.js",
    type: "file",
  }, {
    name: "package/server.js",
    type: "file",
  }, {
    name: "package/server.node.js",
    type: "file",
  }, {
    name: "package/test-utils.js",
    type: "file",
  }, {
    name: "package/unstable-fizz.browser.js",
    type: "file",
  }, {
    name: "package/unstable-fizz.js",
    type: "file",
  }, {
    name: "package/unstable-fizz.node.js",
    type: "file",
  }, {
    name: "package/unstable-native-dependencies.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-server.browser.development.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-server.browser.production.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-server.node.development.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-server.node.production.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-test-utils.development.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-test-utils.production.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-fire.development.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-fire.production.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-fire.profiling.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-fizz.browser.development.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-fizz.browser.production.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-fizz.node.development.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-fizz.node.production.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-native-dependencies.development.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom-unstable-native-dependencies.production.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom.development.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom.production.min.js",
    type: "file",
  }, {
    name: "package/cjs/react-dom.profiling.min.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-server.browser.development.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-server.browser.production.min.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-test-utils.development.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-test-utils.production.min.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-unstable-fire.development.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-unstable-fire.production.min.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-unstable-fire.profiling.min.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-unstable-fizz.browser.development.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-unstable-fizz.browser.production.min.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-unstable-native-dependencies.development.js",
    type: "file",
  }, {
    name: "package/umd/react-dom-unstable-native-dependencies.production.min.js",
    type: "file",
  }, {
    name: "package/umd/react-dom.development.js",
    type: "file",
  }, {
    name: "package/umd/react-dom.production.min.js",
    type: "file",
  }, {
    name: "package/umd/react-dom.profiling.min.js",
    type: "file",
  }
]
 */
