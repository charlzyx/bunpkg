import { esm } from "../experimental/esm";

import { describe, expect, it } from "bun:test";

describe("esm test", () => {
  it("resolve Dots", () => {
    const output = `
import * as whatever from './whatever.js?module'
import a, { b } from '/aha?module'
import c, { d } from './aha?module'
import e, { f } from './../aha?module'
import g, { h } from './../../aha?module'
import i, { j } from '../../../aha?module'
export * from './aha?module';
export * from '/ha?module';
export { what } from '/else?module';
export { why } from './not?module';
`;

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
    const out = esm("/some/esm/feature/index.js", input);
    expect(out).toEqual(output);
  });
});
