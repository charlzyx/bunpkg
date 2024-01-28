import { Context } from "elysia";
import { parsePackageByPathname } from "../utils/helper";
import { queryPackageConfigOfVersion, queryResolveVersion } from "../utils/npm";

export const parse = async ({
  path,
  set,
  query,
}: Pick<Context, "path" | "query" | "set">) => {
  /**
   * --- STEP1. parse and validate package info
   */
  const [reason, info] = parsePackageByPathname(path);

  if (reason || !info) {
    set.status = 403;
    throw new Error(reason!);
  }

  /**
   * --- STEP2. version validate and autofill
   */
  const { packageName, packageSpec } = info;
  // mutable
  let packageVersion = info.packageVersion;
  let filename = info.filename;

  const version = await queryResolveVersion(packageName, packageVersion);

  if (!version) {
    set.status = 404;
    throw new Error(`Cannot find package ${packageSpec}`);
  }

  if (version !== packageVersion) {
    // autofill
    packageVersion = version;
  }

  const packageConfig = await queryPackageConfigOfVersion(
    packageName,
    packageVersion,
  );

  /**
   * --- STEP3. filename validate and autofill
   */

  if (!filename) {
    if (
      query.main &&
      packageConfig[query.main] &&
      typeof packageConfig[query.main] === "string"
    ) {
      // Deprecated, https://github.com/mjackson/unpkg/issues/63
      filename = packageConfig[query.main];
    } else if (packageConfig.unpkg && typeof packageConfig.unpkg === "string") {
      filename = packageConfig.unpkg;
    } else if (
      packageConfig.browser &&
      typeof packageConfig.browser === "string"
    ) {
      // Deprecated, https://github.com/mjackson/unpkg/issues/63
      filename = packageConfig.browser;
    } else {
      filename = packageConfig.main || "/index.js";
    }

    filename = filename.replace(/^[./]*/, "/");
  }

  return { packageName, packageVersion, filename };
};
