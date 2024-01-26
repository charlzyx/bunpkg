import { Elysia, t } from 'elysia';
import path from 'path';
import validateNpmPackageName from 'validate-npm-package-name';
import parsePackagePathname, { isHash } from '../utils/parsePackagePathname';
import {
  searchEntries,
  getPackageConfig,
  resolveVersion,
  getPackage
} from '../utils/npm';
import createPackageURL from '../utils/createPackageURL';
import getContentTypeHeader from '../utils/getContentTypeHeader';

export const bunpkg = (app: Elysia) =>
  app
    // validatePackagePathname
    .derive(({ request, path, query, set, store }) => {
      const parsed = parsePackagePathname(path);
      if (parsed == null) {
        set.status = 403;
        throw new Error(`Invalid URL: ${path}`);
      }
      return parsed;
    })
    // validatePackageName
    .derive(({ request, packageName, path, query, set }) => {
      if (isHash(packageName)) {
        set.status = 403;
        throw new Error(
          `Invalid package name "${packageName}" (cannot be a hash)`
        );
      }
      const errors = validateNpmPackageName(packageName).errors;
      if (errors) {
        const reason = errors.join(', ');
        set.status = 403;
        throw new Error(`Invalid package name "${packageName}" (${reason})`);
      }
      return {};
    })
    // validatePackageVersion
    .derive(
      async ({
        request,
        packageName,
        packageVersion,
        packageSpec,
        filename,
        path,
        query,
        set
      }) => {
        const version = await resolveVersion(
          packageName,
          packageVersion,
          // FIXME
          console
        );
        if (!version) {
          set.status = 404;
          throw new Error(`Cannot find package ${packageSpec}`);
        }
        if (version !== packageVersion) {
          set.redirect = createPackageURL(
            packageName,
            version,
            filename,
            query ? query : {}
          );
        }

        const packageConfig = await getPackageConfig(
          packageName,
          packageVersion,
          // FIXME
          console
        );

        if (!packageConfig) {
          set.status = 500;
          throw new Error(`Cannot get config for package ${packageSpec}`);
        }

        return {
          packageConfig
        };
      }
    )
    // validateFilename
    .derive(
      ({
        filename,
        packageConfig,
        packageName,
        packageVersion,
        packageSpec,
        query,
        set
      }) => {
        if (!filename) {
          let filename: string;
          if (query.module != null) {
            // See https://github.com/rollup/rollup/wiki/pkg.module
            filename = packageConfig.module || packageConfig['jsnext:main'];
            if (!filename) {
              // https://nodejs.org/api/esm.html#esm_code_package_json_code_code_type_code_field
              if (packageConfig.type === 'module') {
                filename = packageConfig.main || '/index.js';
              } else if (
                packageConfig.main &&
                /\.mjs$/.test(packageConfig.main)
              ) {
                filename = packageConfig.main;
              }
            }
            if (!filename) {
              set.status = 404;
              throw new Error(
                `Package ${packageSpec} does not contain an ES module`
              );
            }
          } else if (
            query.main &&
            packageConfig[query.main] &&
            typeof packageConfig[query.main] === 'string'
          ) {
            // Deprecated, see #63
            // https://github.com/mjackson/unpkg/issues/63
            filename = packageConfig[query.main];
          } else if (
            packageConfig.unpkg &&
            typeof packageConfig.unpkg === 'string'
          ) {
            filename = packageConfig.unpkg;
          } else if (
            packageConfig.browser &&
            typeof packageConfig.browser === 'string'
          ) {
            // Deprecated, see #63
            filename = packageConfig.browser;
          } else {
            filename = packageConfig.main || '/index.js';
          }

          set.redirect = createPackageURL(
            packageName,
            packageVersion,
            filename.replace(/^[./]*/, '/'),
            query
          );
        }

        return {};
      }
    )
    // findEntry
    .derive(
      async ({
        packageConfig,
        packageName,
        packageSpec,
        packageVersion,
        filename,
        query,
        set
      }) => {
        const stream = await getPackage(packageName, packageVersion, console);
        const { foundEntry: entry, matchingEntries: entries } =
          await searchEntries(stream!, filename);

        set.headers['Cache-Control'] = 'public, max-age=31536000'; // 1 year
        set.headers['Cache-Tag'] = 'missing, missing-entry';

        if (!entry) {
          set.status = 404;
          throw new Error(`Cannot find package ${filename} in ${packageSpec}`);
        }

        if (entry.type === 'file' && entry.path !== filename) {
          set.redirect = createPackageURL(
            packageName,
            packageVersion,
            entry.path!,
            query
          );
        }

        if (entry.type === 'directory') {
          // We need to redirect to some "index" file inside the directory so
          // our URLs work in a similar way to require("lib") in node where it
          // uses `lib/index.js` when `lib` is a directory.
          const indexEntry =
            entries[`${filename}/index.js`] ||
            entries[`${filename}/index.json`];

          if (indexEntry && indexEntry.type === 'file') {
            // Redirect to the index file so relative imports
            // resolve correctly.
            set.redirect = createPackageURL(
              packageName,
              packageVersion,
              indexEntry.path!,
              query
            );
          } else {
            set.status = 404;
            throw new Error(
              `Cannot find an index in ${filename} in ${packageSpec}`
            );
          }
        }

        return { entry };
      }
    )
    .get('*', async ({ entry }) => {
      const tags = ['file'];

      const ext = path.extname(entry.path!).substr(1);
      console.log('🚀 ~ .get ~ entry.path:', entry.path);
      if (ext) {
        tags.push(`${ext}-file`);
      }

      const resp = new Response(entry.content);
      resp.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      resp.headers.set(
        'Content-Type',
        getContentTypeHeader(entry.contentType!)
      );
      resp.headers.set('Content-Length', entry.size?.toString()!);
      resp.headers.set('Cache-Control', 'public, max-age=31536000');
      resp.headers.set('Last-Modified', entry.lastModified!);
      resp.headers.set('ETag', tags.join(', '));
      return resp;
    });
