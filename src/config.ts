import path from "path";
import os from "os";
import type { cors } from "@elysiajs/cors";

export const BunPkgConfig = {
  get PORT() {
    return process.env.PORT ?? "4567";
  },
  get HOST_NAME() {
    return process.env.HOST_NAME ?? "0.0.0.0";
  },
  get origin() {
    return (
      process.env.ORIGIN ||
      `${process.env.HOST_NAME}:${process.env.PORT}` ||
      "0.0.0.0"
    );
  },
  cors: {
    origin: /^\//.test(Bun.env.CORS_ORIGIN ?? "")
      ? new RegExp(Bun.env.CORS_ORIGIN!)
      : Bun.env.CORS_ORIGIN ?? "*",
  } as Parameters<typeof cors>[0],
  get cacheDir() {
    return Bun.env.CACHE_DIR || path.resolve(os.tmpdir(), "bunpkg_cache");
  },
  get cacheSize() {
    const maybe = Number(Bun.env.CACHE_GIB);
    return Number.isNaN(maybe) ? 4 : maybe;
  },
  set cacheDir(dir: string) {
    Bun.env.CACHEW_DIR = dir;
  },
  get npmAuthToken() {
    return Bun.env.NPM_AUTH_TOKEN;
  },
  get npmRegistryURL() {
    return (Bun.env.NPM_REGISTRY_URL || "https://registry.npmjs.org").replace(
      /\/$/,
      "",
    );
  },
  set npmRegistryURL(neo: string) {
    Bun.env.NPM_REGISTRY_URL = neo;
  },
};
