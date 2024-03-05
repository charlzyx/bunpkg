import { Elysia } from "elysia";
import { sqliteCache } from "../common/cache";

export const purge = (app: Elysia) => {
  /**
   * /purge/react?wild
   * will delete list like this
   * - react-18.0.2.tgz
   * - /npm/react@18.0.2/index.js
   * - /esm/react@18.0.2/index.js
   * - /meta/react@18.0.2/index.js
   *
   * /purge/react-18.0.2.tgz
   * only delte match
   * - react-18.0.2.tgz
   */
  return app.get("/purge/*", async (ctx) => {
    const { path, query } = ctx;
    const pathname = path.replace(/^\/purge\//, "");
    sqliteCache.purge(pathname, query.wild !== undefined);
  });
};
