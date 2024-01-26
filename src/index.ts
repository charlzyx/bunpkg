import { Elysia } from 'elysia';
import { bunpkg } from './plugins/bunpkg';

const PORT = process.env.PORT ?? '4567';
const HOSTNAME = process.env.HOSTNAME ?? '0.0.0.0';

new Elysia()
  .use(bunpkg)
  .get('/', () => 'Hello Elysia')
  .onError(({ code, error }) => {
    return new Response(error.toString());
  })
  .listen({
    hostname: HOSTNAME,
    port: PORT
  });
console.log(
  `Elysia is Running at http://${HOSTNAME}:${PORT}/react@18.2.0/LICENSE`
);
