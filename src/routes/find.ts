import { setMetaHeaders } from "../utils/content";
import { searchPackageEntry } from "../utils/npm";
import { disk } from "../utils/disk";
import { WithPkgInfo } from "./type";

export const find: WithPkgInfo<Response> = async (
  { path, query, set },
  { packageName, packageVersion, filename },
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

    const resp = new Response(entry.content);
    if (entry.content) {
      // bunpkg.com/:package@:version/:file
      const cachekey = `/${packageName}@${packageVersion}${realname}`;
      disk.write(cachekey, entry.content, entry);
    }
    setMetaHeaders(resp, entry);

    return resp;
  } catch (error: any) {
    set.status = 404;
    throw new Error(
      error.toString() ||
        `Cannot find an ${filename} in ${packageName}@${packageVersion}`,
    );
  }
};
