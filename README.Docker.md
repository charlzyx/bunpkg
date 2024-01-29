# BUNPKG

> bunpkg is an alternative for [unpkg](https://unpkg.com/), powered by [bun](https://bun.sh)! friendly for private deploy and file cache supported.

## Features

| feture                                                                                          | bunpkg                                                                  | unpkg   |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| 302 supported, example [npmmirror.com](https://registry.npmmirror.com/react/-/react-18.2.0.tgz) | ✅                                                                     | 🚫       |
| .tgz file cache                                                                                 | ✅ does nginx better, aha?                                             | 🚫       |
| file cache                                                                                      | ✅                                                                     | 🚫       |
| private Authorization header                                                                    | ✅                                                                     | 🚫       |
| Browser UI                                                                                      | 🚫                                                                     | ✅       |
| esm                                                                                             | ✅ by [Bun.Transpiler](https://bun.sh/docs/api/transpiler#scanimports) | ✅ babel |

## .env

> maybe?: config file and persistence

```bash
NPM_REGISTRY_URL=https://registry.npmmirror.com/
PORT=4567
HOST_BINDING=127.0.0.1
CORS_ORIGIN=*
CACHE_DIR=/cache/file
TGZ_CACHE_DIR=/cache/tgz
NPM_AUTH_TOKEN=
```

## docker

```bash
# docker mode supported env
# NPM_REGISTRY_URL=https://registry.npmmirror.com/
# CORS_ORIGIN=*
# NPM_AUTH_TOKEN=
docker run -i -t -p 4567:4567 chaogpt/bunpkg
docker run --env-file .env -i -t -p 4567:4567 chaogpt/bunpkg
```

## Roadmap

- [] persistence cache
- [] live config manager
- [] statistics
- [] programing use and config file
- [] Browser UI

## Dev

```bash
bun dev
# then
# open http://localhost:4567
```

## Powered by

- [Elysia](https://elysiajs.com/)
