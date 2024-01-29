import { Elysia } from "elysia";
import { createSearch, setMetaHeaders } from "../utils/content";
import { disk } from "../utils/disk";
import { find } from "./find";
import { meta } from "./meta";
import { parse } from "./parse";

export const router = (app: Elysia) =>
  app.get("/*", async (ctx) => {
    const { query, path, set } = ctx;
    const info = await parse(ctx);
    const fullpath = `/${info.packageName}@${info.packageVersion}${info.filename}`;

    if (path !== fullpath) {
      set.redirect = fullpath + createSearch(query);
      return;
    } else {
      if ("meta" in query) {
        return parse(ctx).then((go) => meta(ctx, go));
      }
      const esm = "module" in query;

      const cacheKey = esm ? `/esm${path}` : path;

      const maybe = await disk.read(cacheKey);

      if (maybe) {
        const resp = new Response(maybe.file);
        setMetaHeaders(resp, maybe.meta);
        return resp;
      } else {
        return find(ctx as any, info, cacheKey);
      }
    }
  });
