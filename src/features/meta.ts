import { Elysia } from "elysia";
import { TarFileItem } from "nanotar";
import { sqliteCache } from "../common/cache";
import { getMetaList, parsePkgByPathname, resolveVersion } from "../common/pkg";
import { getPkgInfo, simpleMeta } from "./utils";

export const meta = (app: Elysia) => {
  return app.get("/meta/*", async (ctx) => {
    const { path, set } = ctx;
    const pathname = path.replace(/^\/meta/, "");
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
    const fullpath = `/meta/${pkg.pkgName}@${pkg.pkgVersion}${pkg.filename}`;

    set.headers["Cache-Control"] = "public, max-age=31536000"; // 1 year
    set.headers["Cache-Tag"] = "missing, missing-entry";

    if (path !== fullpath) {
      set.redirect = fullpath;
      return;
    }

    const cacheKey = path;

    const maybe = await sqliteCache.read(cacheKey);
    if (maybe) {
      // cached
      const resp = Response.json(maybe);
      return resp;
    } else {
      // no cached
      const metaList: TarFileItem[] = await getMetaList(pkg);
      const prefix = path
        .replace(/\/meta\//, "package")
        .replace(pkg.pkgSpec, "");
      let list = metaList.reduce(
        (ret, item) => {
          if (item.name.startsWith(prefix)) {
            ret.push(simpleMeta(item));
          }
          return ret;
        },
        [] as { name: string; lastModified: number }[],
      );

      if (list.length === 0) {
        list = metaList.map(simpleMeta);
      }

      sqliteCache.write(cacheKey, list);
      const resp = Response.json(list as any);
      return resp;
    }
  });
};
