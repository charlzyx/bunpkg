import { Context } from "elysia";

export type WithPkgInfo<T = any> = (
  ctx: Pick<Context, "path" | "query" | "set">,
  pkg: {
    packageName: string;
    packageVersion: string;
    filename: string;
  },
) => Promise<T>;
