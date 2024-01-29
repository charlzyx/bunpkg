import path from "path";
import os from "os";
import type { cors } from "@elysiajs/cors";

export const BunPkgConfig = {
  get PORT() {
    return process.env.PORT ?? "4567";
  },
  get HOST_BINDING() {
    return process.env.HOST_BINDING ?? "0.0.0.0";
  },
  cors: {
    origin: /^\//.test(Bun.env.CORS_ORIGIN ?? "")
      ? new RegExp(Bun.env.CORS_ORIGIN!)
      : Bun.env.CORS_ORIGIN ?? "*",
  } as Parameters<typeof cors>[0],
  get cacheDir() {
    return Bun.env.CACHE_DIR || path.resolve(os.tmpdir(), "bunpkg_cache");
  },
  get tgzCacheDir() {
    return (
      Bun.env.TGZ_CACHE_DIR || path.resolve(os.tmpdir(), "bunpkg_tgz_cache")
    );
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
