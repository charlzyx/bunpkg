# BUNPKG

> [!CAUTION]
> Work in Progress, CANNOT WORK NOW!

> this is a reimplement for [unpkg](https://unpkg.com/), but with [bun](https://bun.sh).


## Features

|feture|unpkg|bunpkg|
|---|---|---|
| 302 .tgz supported, example [npmmirror.com](https://registry.npmmirror.com/react/-/react-18.2.0.tgz) | ✅ | 🚫 |
| .tgz file cache | ✅  does nginx better, aha?  | 🚫 |
| private Authorization header |  ✅  | 🚫 |
| Browser UI |  🚫 |  ✅ |


## BunConfig 

> WIP: config file and persistence

```ts
export const BunPkgConfig = {
  get cacheDir() {
    return Bun.env.CACHEW_DIR || path.resolve(os.tmpdir(), "bunpkg_cache");
  },
  get npmAuthToken() {
    return Bun.env.NPM_AUTH_TOKEN;
  },
  set cacheDir(dir: string) {
    Bun.env.CACHEW_DIR = dir;
  },
  get npmRegistryURL() {
   return Bun.env.NPM_REGISTRY_URL || "https://registry.npmjs.org";
  },
  set npmRegistryURL(neo: string) {
    Bun.env.NPM_REGISTRY_URL = neo;
  },
};

```

## cache

## Roadmap

- [] config file
- [] persistence cache 
- [] live config manager 
- [] statistics 
- [] Browser UI 

## Dev

```bash
bun dev
# then
# open http://localhost:4567/react@18.2.0/LICENSE
```

## Powered by

- [Elysia](https://elysiajs.com/)
