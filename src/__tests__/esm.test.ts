import { BunPkgConfig } from "../config.final";
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
import * as whatever from 'https://bunpkg.esm/esm/pkg@v1.2.3/some/esm/feature/whatever.js'
import a, { b } from 'https://bunpkg.esm/esm/aha'
import c, { d } from 'https://bunpkg.esm/esm/pkg@v1.2.3/some/esm/feature/aha'
import e, { f } from 'https://bunpkg.esm/esm/pkg@v1.2.3/some/esm/aha'
import g, { h } from 'https://bunpkg.esm/esm/pkg@v1.2.3/some/aha'
import i, { j } from 'https://bunpkg.esm/esm/pkg@v1.2.3/aha'
export * from 'https://bunpkg.esm/esm/pkg@v1.2.3/some/esm/feature/aha';
export * from 'https://bunpkg.esm/esm/ha';
export { what } from 'https://bunpkg.esm/esm/else';
export { why } from 'https://bunpkg.esm/esm/pkg@v1.2.3/some/esm/feature/not';
`;
    const out = toESM(ORIGIN, "pkg@v1.2.3/some/esm/feature/index.js", input);
    console.log(`🚀 ~ it ~ o:`, out);
    expect(out).toEqual(output);
  });
});
