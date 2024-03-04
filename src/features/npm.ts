import { Elysia } from "elysia";
import { sqliteCache } from "../common/cache";
import {
  findIndex,
  getConfigOfVersion,
  parsePkgByPathname,
  resolveTgz,
  resolveVersion,
} from "../common/pkg";
import { appendMetaHeaders, getPkgInfo, qs } from "./utils";

export const npm = (app: Elysia) => {
  return app.get("/npm/*", async (ctx) => {
    const { query, path, set } = ctx;
    const pathname = path.replace(/^\/npm/, "");
    // ---step.1.1 local:: base parse and valid
    const pkg = parsePkgByPathname(pathname);
    // ---step.1.2 query remote
    const remote = await getPkgInfo(pkg.pkgName);
    // console.log(`🚀 ~ step.1.2 ~ pkg:`, remote);
    // ---step.1.3 resolve version
    const version = resolveVersion(pkg, remote);

    if (version !== pkg.pkgVersion) {
      pkg.pkgVersion = version;
    }
    // ---step.1.4 find filename if not gived
    if (!pkg.filename) {
      const conf = getConfigOfVersion(pkg, remote);
      pkg.filename = findIndex(conf, { esm: false, main: query.main });
      console.log(`🚀 ~ returnapp.get ~ c:`, conf, pkg);
    }

    const fullpath = `/npm/${pkg.pkgName}@${pkg.pkgVersion}${pkg.filename}`;

    set.headers["Cache-Control"] = "public, max-age=31536000"; // 1 year
    set.headers["Cache-Tag"] = "missing, missing-entry";

    // ---step.1.5 should 302
    if (path !== fullpath) {
      set.redirect = fullpath + qs(query);
      return;
    }
    const cacheKey = path;

    const maybe = await sqliteCache.read(cacheKey);
    if (maybe) {
      // cached
      const resp = new Response(maybe.file);
      appendMetaHeaders(resp, maybe?.meta);
      return resp;
    } else {
      // no cached
      const [filebuffer, meta] = await resolveTgz(pkg, cacheKey);
      const resp = new Response(filebuffer as any);
      appendMetaHeaders(resp, meta);
      return resp;
    }
  });
};
