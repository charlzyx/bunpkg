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
    expect(out).toEqual(output);
  });

  it("mjs", () => {
    const input = `
import { $ as $Fetch } from './shared/ofetch.441891d5.mjs';
export { C as CreateFetchOptions, b as FetchContext, e as FetchError, c as FetchOptions, F as FetchRequest, a as FetchResponse, I as IFetchError, S as SearchParameters, d as createFetch, f as createFetchError } from './shared/ofetch.441891d5.mjs';

declare function createNodeFetch(): (input: RequestInfo, init?: RequestInit) => any;
declare const fetch: typeof globalThis.fetch;
declare const Headers: {
    new (init?: HeadersInit | undefined): Headers;
    prototype: Headers;
};
declare const AbortController: {
    new (): AbortController;
    prototype: AbortController;
};
declare const ofetch: $Fetch;
declare const $fetch: $Fetch;

export { $Fetch, $fetch, AbortController, Headers, createNodeFetch, fetch, ofetch };
`;

    const ouput = `
import { $ as $Fetch } from 'https://bunpkg.esm/esm/ofetch@1.3.3/dist/shared/ofetch.441891d5.mjs';
export { C as CreateFetchOptions, b as FetchContext, e as FetchError, c as FetchOptions, F as FetchRequest, a as FetchResponse, I as IFetchError, S as SearchParameters, d as createFetch, f as createFetchError } from 'https://bunpkg.esm/esm/ofetch@1.3.3/dist/shared/ofetch.441891d5.mjs';

declare function createNodeFetch(): (input: RequestInfo, init?: RequestInit) => any;
declare const fetch: typeof globalThis.fetch;
declare const Headers: {
    new (init?: HeadersInit | undefined): Headers;
    prototype: Headers;
};
declare const AbortController: {
    new (): AbortController;
    prototype: AbortController;
};
declare const ofetch: $Fetch;
declare const $fetch: $Fetch;

export { $Fetch, $fetch, AbortController, Headers, createNodeFetch, fetch, ofetch };
`;
    const out = toESM(ORIGIN, "ofetch@1.3.3/dist/node.d.mts", input);
    expect(out).toEqual(ouput);
  });
});
