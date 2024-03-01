import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { router } from "./routes/router";
import path from "path";
import { jwt } from "@elysiajs/jwt";
import { BunPkgConfig } from "./config";
import { err } from "./templates";
import { Consola } from "consola";
import { getPort } from "get-port-please";

Object.assign(console, Consola);
// static file server
Bun.serve({
  port: 45456,
  hostname: "127.0.0.1",
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const fileAt = path.join(BunPkgConfig.cacheDir, pathname);
    return new Response(Bun.file(fileAt));
  },
});

const app = new Elysia();

app
  .use(cors(BunPkgConfig.cors))
  .use(
    jwt({
      name: "jwt",
      secret: BunPkgConfig.jwtSecret || "NONE",
    }),
  )
  .get("favicon.ico", () => {
    return new Response("");
  })
  .get("", ({ set }) => {
    set.redirect = "/";
  })
  .guard(
    {
      async beforeHandle({ set, jwt, path, cookie: { auth } }) {
        const hasJwt = BunPkgConfig.jwtSecret;
        if (!hasJwt) return;
        const isSign = /\/_sign\/\w+/.test(path);
        if (isSign) return;

        const profile = await jwt.verify(auth.value);
        // console.log("🚀 ~ beforeHandle ~ profile:", profile);

        if (!profile) {
          set.status = 401;
          return "Unauthorized";
        }
      },
    },

    (app) =>
      app
        .get("/_sign/:name", async ({ jwt, set, cookie: { auth }, params }) => {
          const userlist = BunPkgConfig.jwtUserList;
          // TODO: sqlite user.db
          if (!userlist.includes(params.name)) {
            set.status = 401;
            return "Unauthorized";
          } else {
            auth.set({
              value: await jwt.sign(params),
              httpOnly: true,
              maxAge: 7 * 86400,
              path: "/",
            });

            return "welcome";
          }
        })

        .get("/browser/*", (ctx) => {
          return "TODO: file browser";
        })
        .get("/", () => {
          const resp = new Response(Bun.file("src/templates/BUNPKG.html"));
          resp.headers.set("Content-Type", "text/html; charset=utf8");
          return resp;
        })
        .use(router),
  )

  .onError(({ code, error, path }) => {
    const resp = new Response(
      err("reason", error?.message || error.toString()),
    );
    resp.headers.set("Content-Type", "text/html; charset=utf8");
    console.log(
      `[Error]: ${new Date().toLocaleString()} ${path}\n`,
      error.stack,
      error.message,
    );
    return resp;
  })
  .listen({
    hostname: BunPkgConfig.HOST_NAME,
    port: BunPkgConfig.PORT,
  });

const black = /npmAuthToken|jwtSecret/;

console.log(
  `BUNPKG is Running at http://${BunPkgConfig.HOST_NAME}:${BunPkgConfig.PORT}`,
  "with BunConfig :\n",
  JSON.stringify(
    Object.keys(BunPkgConfig).reduce(
      (ok: any, key) => {
        if (black.test(key)) return ok;
        ok[key] = BunPkgConfig[key as keyof typeof BunPkgConfig];
        return ok;
      },
      {} as typeof BunPkgConfig,
    ),
    null,
    2,
  ),
);
