import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import consola from "consola";
import { Elysia, t } from "elysia";
import { getPort } from "get-port-please";
import { markError } from "./common/err";
import { BunPkgConfig, EMPTY_JWT_SECRET } from "./config.final";
import { esm } from "./features/esm";
import { meta } from "./features/meta";
import { npm } from "./features/npm";
import { user } from "./features/user";
import { staticPlugin } from "@elysiajs/static";

const app = new Elysia();
const noop = () => "";

const PORT = await getPort(BunPkgConfig.server.port);

const host: {
  hostname?: string;
  port: string | number;
} = {
  port: PORT,
};
if (BunPkgConfig.server.host) {
  host.hostname = BunPkgConfig.server.host;
}

app
  .use(cors(BunPkgConfig.server.cors))
  .use(jwt(BunPkgConfig.jwt))
  .use(staticPlugin({ assets: "docs/dist", prefix: "/" }))
  .guard(
    {
      async beforeHandle({ jwt, path, cookie: { auth } }) {
        const enable = BunPkgConfig.jwt.secret !== EMPTY_JWT_SECRET;
        if (!enable) return;
        const isSign = path.startsWith("/_sign/");
        if (isSign) return;

        const profile = await jwt.verify(auth.value);

        if (!profile) {
          throw markError("UnAuthorizedError");
        }
      },
    },

    (app) =>
      app
        .post(
          "/_sign/user",
          async ({ jwt, cookie: { auth }, params, body }) => {
            const come = {
              name: body.name,
              // TODO: 前端加密算法
              pwd: body.pwd!,
            };
            const neo = await user.verify(come);
            // 用户存在且密码正确
            auth.set({
              value: await jwt.sign(neo!),
              httpOnly: true,
              maxAge: 7 * 86400,
              path: "/",
            });
          },
          {
            body: t.Object({
              name: t.String(),
              pwd: t.String(),
            }),
          },
        )
        .post(
          "/_sign/new",
          async ({ jwt, cookie: { auth }, body }) => {
            const come = {
              name: body.name,
              // TODO: 前端加密算法
              pwd: body.pwd!,
            };
            const neo = await user.upsert(come);
            auth.set({
              value: await jwt.sign(neo!),
              httpOnly: true,
              maxAge: 7 * 86400,
              path: "/",
            });
          },
          {
            body: t.Object({
              name: t.String(),
              pwd: t.String(),
            }),
          },
        )
        .use(npm)
        .use(meta)
        .use(esm)
        // .get("/", () => {
        //   const resp = new Response(Bun.file("src/templates/BUNPKG.html"));
        //   resp.headers.set("Content-Type", "text/html; charset=utf-8");
        //   return resp;
        // })
        .get("/favicon.ico", noop)
        .get("/apple-touch-icon.png", noop)
        .get("/apple-touch-icon-precomposed.png", noop),
  )

  .onError(({ code, error, path, set }) => {
    // resp.headers.set("Content-Type", "text/html; charset=utf-8");
    consola.error(
      `[Error]: ${new Date().toLocaleString()} ${path}\n`,
      error.stack,
      error.message,
    );
    return error;
  })
  .listen(host, ({ hostname, port }) => {
    console.info(`BUNPKG is Running at http://${hostname}:${port}`);
  });
