import path from "path";
import os from "os";

export const BunPkgConfig = {
  get cacheDir() {
    return Bun.env.CACHEW_DIR || path.resolve(os.tmpdir(), "bunpkg_cache");
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
