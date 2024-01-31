import { searchPackageEntry, searchPackageEntryMeta } from "../utils/npm";
import { WithPkgInfo } from "./type";

export const meta: WithPkgInfo<Response> = async (
  { path, query, set },
  { packageName, packageVersion, filename },
) => {
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
      `Cannot find meta of ${filename} in ${packageName}@${packageVersion}. Case by ${error.toString()}`,
    );
  }
};
