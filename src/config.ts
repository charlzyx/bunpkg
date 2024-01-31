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
    return process.env.ORIGIN || `http://localhost${process.env.PORT}`;
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

  get npmRegistryURL() {
    return (Bun.env.NPM_REGISTRY_URL || "https://registry.npmjs.org").replace(
      /\/$/,
      "",
    );
  },
  get npmAuthToken() {
    return Bun.env.NPM_AUTH_TOKEN;
  },
  get jwtSecret() {
    return Bun.env.JWT_SECRET;
  },
  get jwtUserList() {
    return (Bun.env.JWT_USERS || "").split(",").map((item) => item.trim());
  },
  // TODO: The list to ban some packages or scopes.
  // banList: {
  //   packages: ["@some_scope/package_name"],
  //   scopes: [
  //     {
  //       name: "@your_scope",
  //       excludes: ["package_name"],
  //     },
  //   ],
  // },

  // // TODO: The list to only allow some packages or scopes.
  // allowList: {
  //   packages: ["@some_scope/package_name"],
  //   scopes: [
  //     {
  //       name: "@your_scope",
  //     },
  //   ],
  // },
};
