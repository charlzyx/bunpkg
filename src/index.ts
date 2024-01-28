import { Elysia } from "elysia";
import { router } from "./routes/router";

const PORT = process.env.PORT ?? "4567";
const HOSTNAME = process.env.HOSTNAME ?? "0.0.0.0";

new Elysia()
  .get("/browser/*", (ctx) => {
    return "TODO: file browser";
  })
  .get("/", () => "Hello BUNPKG")
  .use(router)
  .onError(({ code, error }) => {
    return new Response(error.toString());
  })
  .listen({
    hostname: HOSTNAME,
    port: PORT,
  });
console.log(
  `Elysia is Running at http://${HOSTNAME}:${PORT}/react@18.2.0/LICENSE`,
);
