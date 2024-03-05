const transpiler = new Bun.Transpiler({
  loader: "js",
});
const resolveDots = (origin: string, withdot: string, relative: string) => {
  // keep slash free
  // http://bunpkg.esm ->  http://git.esm
  // http://bunpkg.esm/ ->  http://git.esm
  const realOrigin = `${origin.replace(/\/^/, "")}/esm`;
  if (!/\./.test(withdot)) return `${realOrigin}/${withdot}`;
  const plist = relative.split("/");
  plist.pop();
  // '../../xx'.match(/(\.\.\/)/g) => ['../', '../']
  // './../xx'.match(/(\.\.\/)/g) => ['../']
  const upto = withdot.match(/(\.\.\/)/g)?.length || 0;
  for (let index = 0; index < upto; index++) {
    plist.pop();
  }

  const clean = withdot.replace(/\.{1,2}\//g, "");
  plist.push(clean);

  return `${realOrigin}/${plist.filter(Boolean).join("/")}`;
};

// const reLink = (x: string) => {
//   if (!/\./.test(x)) return `/${x}`;
//   return x;
// };
export const toESM = (
  /** https://bunpkg.esm:2345 */
  origin: string,
  /** jquery@1.2.3/esm/index.js */
  pkgpath: string,
  code: string,
) => {
  let copy = code;
  // https://unpkg.com/@pro.formily/antd@1.1.1/dist/esm/index.js

  const imps = (relative: string) =>
    transpiler.scanImports(copy).map((item) => {
      return {
        reg: new RegExp(
          `([import|export].*from)\\s+["'](${item.path})["']`,
          "g",
        ),
        replacer: (_: string, m: string) => {
          return `${m} '${resolveDots(origin, item.path, relative)}'`;
        },
      };
    });

  imps(pkgpath).forEach((item) => {
    copy = copy.replace(item.reg, item.replacer);
  });
  return copy;
};
