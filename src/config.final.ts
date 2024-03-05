import defu from "defu";

const keepNumber = (x?: string) => {
  if (!x) return undefined;
  return /^\d+$/.test(x) ? Number.parseInt(x) : undefined;
};

import { BunPkgConfig as CustomConfig } from "./bunpkg.config";

const env = {
  server: {
    port: keepNumber(Bun.env.PORT),
    host: Bun.env.HOST,
    cros: {
      origin: Bun.env.CORS_ORIGIN,
    },
  },
  cache: {
    dir: Bun.env.CACHE_DIR,
    maxSize: keepNumber(Bun.env.CACHE_MAX_SIZE),
  },
  esm: {
    origin: Bun.env.ESM_ORIGIN,
  },
  npm: {
    registry: Bun.env.NPM_REGISTRY,
    authToken: Bun.env.NPM_AUTHTOKEN,
    maxTgzSize: keepNumber(Bun.env.NPM_MAX_TGZ_SIZE),
  },
  jwt: {
    secret: Bun.env.JWT_SECRET,
  },
};

const defaults = {
  server: {
    port: 4567,
    cors: {
      origin: "*",
    },
    // host: "0.0.0.0",
  },
  cache: {
    dir: "/cache",
    maxSize: 4,
  },
  esm: {
    origin: "",
  },
  npm: {
    registry: "https://registry.npmjs.org/",
    maxTgzSize: 100,
  },
  jwt: {
    secret: "",
  },
  // TODO, reference esm.sh#config
  // allowList: []
  // banList: []
} as const;

export const EMPTY_JWT_SECRET = "EMPTY_JWT_SECRET";

const merged = defu(env, CustomConfig, defaults);

merged.jwt.secret = merged.jwt.secret ? merged.jwt.secret : EMPTY_JWT_SECRET;
merged.npm.registry = merged.npm.registry.replace(/\/$/, "");
console.log(`🚀 ~ merged:`, merged);

export const BunPkgConfig = merged;
