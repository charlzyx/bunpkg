import { searchPackageEntry, searchPackageEntryMeta } from "../utils/npm";
import { WithPkgInfo } from "./type";

export const meta: WithPkgInfo<Response> = async (
  { path, query, set },
  { packageName, packageVersion, filename },
) => {
  /**
   */
  set.headers["Cache-Control"] = "public, max-age=31536000"; // 1 year
  set.headers["Cache-Tag"] = "missing, missing-entry";
  try {
    const meta = await searchPackageEntryMeta(
      packageName,
      packageVersion,
      filename,
    );

    return Response.json(meta);
  } catch (error: any) {
    set.status = 404;
    throw new Error(
      error.toString() ||
        `Cannot find an meta of ${filename} in ${packageName}@${packageVersion}`,
    );
  }
};
