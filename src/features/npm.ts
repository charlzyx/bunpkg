import { Elysia } from "elysia";
import { memoCache, sqliteCache } from "../common/cache";
import {
  findIndex,
  getConfigOfVersion,
  parsePkgByPathname,
  resolveTgz,
  resolveVersion,
  queryPkgInfo,
} from "../common/pkg";
import { appendMetaHeaders, qs } from "./utils";

export const npm = (app: Elysia) => {
  /**
   * /npm/pkg[@version][/filename]
   * @example
   * /npm/react
   * /npm/react@18.0.2
   * /npm/react@18.0.2/index.js
   *
   * @params purge @type boolean 删除当前缓存
   * @params main @type string 手动指定pkg当前入口文件, 如果没有给出 pathname 的话
   */
  return app.get("/npm/*", async (ctx) => {
    const { query, path, set } = ctx;
    if (query.purge !== undefined) {
      sqliteCache.purge(path);
      return Response.json({ message: `PURGE CACHE ${path} SUCCESS!` });
    }
    const cacheKey = path;

    const maybe = memoCache.get(cacheKey) || (await sqliteCache.read(cacheKey));

    if (maybe) {
      // transform sqlite cached  to memoCache
      if (!memoCache.has(cacheKey)) {
        memoCache.set(cacheKey, maybe);
      }
      const resp = new Response(maybe.file);
      appendMetaHeaders(resp, maybe?.meta);
      return resp;
    } else {
      const pathname = path.replace(/^\/npm/, "");
      // ---step.1.1 local:: base parse and valid
      const pkg = parsePkgByPathname(pathname);
      // ---step.1.2 query remote
      const remote = await queryPkgInfo(pkg.pkgName);

      // ---step.1.3 resolve version
      const version = resolveVersion(pkg, remote);

      if (version !== pkg.pkgVersion) {
        pkg.pkgVersion = version;
      }
      // ---step.1.4 find filename if not gived
      if (!pkg.filename) {
        const conf = await getConfigOfVersion(pkg, remote);
        pkg.filename = findIndex(conf, { esm: false, main: query.main });
      }

      const fullpath = `/npm/${pkg.pkgName}@${pkg.pkgVersion}${pkg.filename}`;

      set.headers["Cache-Control"] = "public, max-age=31536000"; // 1 year
      set.headers["Cache-Tag"] = "missing, missing-entry";

      // ---step.1.5 should 302
      if (path !== fullpath) {
        set.redirect = fullpath + qs(query);
        return;
      }

      // no cached
      const [filebuffer, meta] = await resolveTgz(pkg, cacheKey);
      const resp = new Response(filebuffer as any);
      appendMetaHeaders(resp, meta);
      return resp;
    }
  });
};
