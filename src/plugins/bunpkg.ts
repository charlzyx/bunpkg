import { Elysia, t } from 'elysia';
import validateNpmPackageName from 'validate-npm-package-name';
import parsePackagePathname, { isHash } from '../utils/parsePackagePathname';
import { getPackageConfig, resolveVersion, getPackage } from '../utils/npm';
import bufferStream from '../utils/bufferStream';
import createPackageURL from '../utils/createPackageURL';

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
    .get('*', async ({ packageName, packageConfig, packageVersion }) => {
      const stream = await getPackage(packageName, packageVersion, console);
      const content = await bufferStream(stream!);
      const resp = new Response(stream as any);
      resp.headers.set('Content-Type', 'application/javascript; charset=utf-8');
      resp.headers.set('Content-Length', content.length);
      return resp;
    });
