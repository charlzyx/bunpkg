import { Elysia } from "elysia";
import { router } from "./routes/router";
import { cors } from "@elysiajs/cors";

import { BunPkgConfig } from "./config";
import { home, err } from "./templates";

new Elysia()
  .use(cors(BunPkgConfig.cors))
  .get("/browser/*", (ctx) => {
    return "TODO: file browser";
  })
  .get("/", () => {
    const resp = new Response(home);
    resp.headers.set("Content-Type", "text/html; charset=utf8");
    return resp;
  })
  .use(router)
  .onError(({ code, error }) => {
    const resp = new Response(
      err("reason", error?.message || error.toString()),
    );
    resp.headers.set("Content-Type", "text/html; charset=utf8");
    return resp;
  })
  .listen({
    hostname: BunPkgConfig.HOSTNAME,
    port: BunPkgConfig.PORT,
  });
console.log(
  `Elysia is Running at http://${BunPkgConfig.HOSTNAME}:${BunPkgConfig.PORT}/react@18.2.0/LICENSE`,
);
