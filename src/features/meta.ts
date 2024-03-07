import { Elysia, t } from "elysia";
import { TarFileItem } from "nanotar";
import { memoCache, sqliteCache } from "../common/cache";
import {
  parsePkgByPathname,
  queryMetaList,
  resolveVersion,
  queryPkgInfo,
  getConfigOfVersion,
} from "../common/pkg";
import { simpleMeta } from "./utils";

export const meta = (app: Elysia) => {
  /**
   * /meta/pkg[@version][/filename]
   * @example
   * /meta/react
   * /meta/react@18.0.2/src
   * /meta/react@18.0.2/index.js
   *
   * if not match filename, will be return all fileList
   *
   * @returns {
   *    name: string
   * }[]
   *
   * @params purge @type boolean 删除当前缓存
   */
  return app.get(
    "/meta/*",
    async (ctx) => {
      const { query, path, set } = ctx;
      if (query.purge !== undefined) {
        sqliteCache.purge(path);
        return Response.json({ message: `PURGE CACHE ${path} SUCCESS!` });
      }
      const cacheKey = path;

      const maybe =
        memoCache.get(cacheKey) || (await sqliteCache.read(cacheKey));

      if (maybe) {
        // transform sqlite cached  to memoCache
        if (!memoCache.has(cacheKey)) {
          memoCache.set(cacheKey, maybe);
        }
        const resp = Response.json(maybe);
        return resp;
      } else {
        const pathname = path.replace(/^\/meta/, "");
        // ---step.1.1 local:: base parse and valid
        const pkg = parsePkgByPathname(pathname);
        // ---step.1.2 query remote
        const remote = await queryPkgInfo(pkg.pkgName);
        if (query.versions !== undefined) {
          const cacheKey = `${path}?versions`;
          const cached = await sqliteCache.read(cacheKey);
          if (cached) {
            return Response.json(cached);
          } else {
            const versions = Object.keys(remote.versions || {});
            const tags = remote.tags ?? (remote?.["dist-tags"] || {});
            versions.sort(Bun.semver.order).reverse();
            const info = { versions, tags };
            await sqliteCache.write(cacheKey, info, 1000 * 60);
            return Response.json(info);
          }
        }
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

        // no cached
        const metaList: TarFileItem[] = await queryMetaList(pkg);
        const pkgConfig = await getConfigOfVersion(pkg);
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
        const info = { files: list, info: pkgConfig };

        sqliteCache.write(cacheKey, info);
        const resp = Response.json(info);
        return resp;
      }
    },
    {
      // query: t.Object({
      // purge: t.Optional(t.String()),
      // versions: t.Optional(t.String()),
      // }),
    },
  );
};
