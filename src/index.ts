import { Elysia } from "elysia";
import { router } from "./routes/router";
import { cors } from "@elysiajs/cors";

import { BunPkgConfig } from "./config";
import path from "path";
import { err } from "./templates";

// static file server
Bun.serve({
  port: 45456,
  hostname: "127.0.0.1",
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const fileAt = path.join(
      BunPkgConfig.cacheDir,
      "tgz",
      pathname.replace(/^\/tgz/, ""),
    );
    return new Response(Bun.file(fileAt));
  },
});

new Elysia()
  .use(cors(BunPkgConfig.cors))
  .get("favicon.ico", () => {
    return new Response("");
  })
  .get("", ({ set }) => {
    set.redirect = "/";
  })
  .get("/browser/*", (ctx) => {
    return "TODO: file browser";
  })
  .get("/", () => {
    const resp = new Response(Bun.file("src/templates/BUNPKG.html"));
    resp.headers.set("Content-Type", "text/html; charset=utf8");
    return resp;
  })
  .use(router)
  .onError(({ code, error }) => {
    const resp = new Response(
      err("reason", error?.message || error.toString()),
    );
    resp.headers.set("Content-Type", "text/html; charset=utf8");
    console.log(`ERROR:${new Date().toLocaleDateString()}\n`, error.stack);
    return resp;
  })
  .listen({
    hostname: BunPkgConfig.HOST_NAME,
    port: BunPkgConfig.PORT,
  });

console.log(
  `BUNPKG is Running at http://${BunPkgConfig.HOST_NAME}:${BunPkgConfig.PORT}`,
  "with BunConfig :\n",
  JSON.stringify(BunPkgConfig, null, 2),
);
