const transpiler = new Bun.Transpiler({
  loader: "js",
});
// const resolveDots = (withdot: string, relative: string) => {
//   if (!/\./.test(withdot)) return `/${withdot}`;
//   const plist = relative.split("/");
//   plist.pop();
//   // '../../xx'.match(/(\.\.\/)/g) => ['../', '../']
//   // './../xx'.match(/(\.\.\/)/g) => ['../']
//   const upto = withdot.match(/(\.\.\/)/g)?.length || 0;
//   for (let index = 0; index < upto; index++) {
//     plist.pop();
//   }

//   const clean = withdot.replace(/\.{1,2}\//g, "");
//   plist.push(clean);

//   return plist.join("/");
// };

const reLink = (x: string) => {
  if (!/\./.test(x)) return `/${x}`;
  return x;
};
export const esm = (pkgpath: string, code: string) => {
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
          return `${m} '${reLink(item.path)}?module'`;
        },
      };
    });

  imps(pkgpath).forEach((item) => {
    copy = copy.replace(item.reg, item.replacer);
  });
  return copy;
};
