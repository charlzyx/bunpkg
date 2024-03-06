import { getContentType } from "../common/file";

import { describe, expect, it } from "bun:test";

describe("mime test", () => {
  it("files", () => {
    expect(getContentType("abc/f.ts")).toBe("text/x-typescript");
    expect(getContentType("abc/f.d.ts")).toBe("text/x-typescript");
    expect(getContentType("abc/f.cts")).toBe("text/x-typescript");
    expect(getContentType("abc/f.mts")).toBe("text/x-typescript");

    expect(getContentType("abc/f.js")).toBe("application/javascript");
    expect(getContentType("abc/f.cjs")).toBe("application/node");
    expect(getContentType("abc/f.mjs")).toBe("application/javascript");
  });
});
