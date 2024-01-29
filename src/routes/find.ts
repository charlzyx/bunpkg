import { setMetaHeaders } from "../utils/content";
import { searchPackageEntry } from "../utils/npm";
import { Context } from "elysia";
import { disk } from "../utils/disk";
import { esm } from "../experimental/esm";
import { URL } from "whatwg-url";
import { BunPkgConfig } from "../config";

export const find = async (
  { path, query, set, request }: Context,
  {
    packageName,
    packageVersion,
    filename,
  }: {
    packageName: string;
    packageVersion: string;
    filename: string;
  },
  cacheKey: string,
) => {
  /**
   * --- STEP4. find file in tarball
   */
  set.headers["Cache-Control"] = "public, max-age=31536000"; // 1 year
  set.headers["Cache-Tag"] = "missing, missing-entry";
  try {
    const { entry, filename: realname } = await searchPackageEntry(
      packageName,
      packageVersion,
      filename,
    );

    const isModule = "module" in query;
    const cache = entry.content;
    if (isModule) {
      const origin = entry.content.toString();
      const bunpkgESM = esm(
        `${packageName}@${packageVersion}/${filename}`,
        origin,
      );

      const resp = new Response(bunpkgESM);
      setMetaHeaders(resp, entry);
      return resp;
    } else {
      const resp = new Response(entry.content);
      if (cache) {
        // bunpkg.com/:package@:version/:file
        const cachekey = `/${packageName}@${packageVersion}${realname}`;
        disk.write(cachekey, cache, entry);
      }
      setMetaHeaders(resp, entry);

      return resp;
    }
  } catch (error: any) {
    set.status = 404;
    throw new Error(
      error.toString() ||
        `Cannot find an ${filename} in ${packageName}@${packageVersion}`,
    );
  }
};
