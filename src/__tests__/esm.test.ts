import { BunPkgConfig } from "../config";
import { toESM } from "../experimental/esm";

import { describe, expect, it } from "bun:test";

describe("esm test", () => {
  const ORIGIN = "https://bunpkg.esm";

  it("resolve Dots", () => {
    const input = `
import * as whatever from "./whatever.js"
import a, { b } from "aha"
import c, { d } from "./aha"
import e, { f } from "./../aha"
import g, { h } from "./../../aha"
import i, { j } from "../../../aha"
export * from './aha';
export * from 'ha';
export { what } from 'else';
export { why } from './not';
`;

    const output = `
import * as whatever from 'https://bunpkg.esm/pkg@v1.2.3/some/esm/feature/whatever.js?module'
import a, { b } from 'https://bunpkg.esm/aha?module'
import c, { d } from 'https://bunpkg.esm/pkg@v1.2.3/some/esm/feature/aha?module'
import e, { f } from 'https://bunpkg.esm/pkg@v1.2.3/some/esm/aha?module'
import g, { h } from 'https://bunpkg.esm/pkg@v1.2.3/some/aha?module'
import i, { j } from 'https://bunpkg.esm/pkg@v1.2.3/aha?module'
export * from 'https://bunpkg.esm/pkg@v1.2.3/some/esm/feature/aha?module';
export * from 'https://bunpkg.esm/ha?module';
export { what } from 'https://bunpkg.esm/else?module';
export { why } from 'https://bunpkg.esm/pkg@v1.2.3/some/esm/feature/not?module';
`;
    const out = toESM(ORIGIN, "pkg@v1.2.3/some/esm/feature/index.js", input);
    console.log("🚀 ~ it ~ out:", out);
    expect(out).toEqual(output);
  });
});
