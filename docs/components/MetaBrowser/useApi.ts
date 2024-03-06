import { useRequest } from "ahooks";
import { ofetch } from "ofetch";
import { useEffect } from "react";
import validate from "validate-npm-package-name";

const fetchFileList = (pkg: { name: string; ver: string }): Promise<{
  files: { name: string; size: number }[];
  info: {
    version?: string;
    name?: string;
  };
}> => ofetch(`/meta/${pkg.name}@${pkg.ver}`);

const fetchVersions = (
  pkg: string,
): Promise<{
  versions: string[];
  tags: Record<string, string>;
}> => ofetch(`/meta/${pkg}?versions`);

export const usePkgFileList = (pkgName: string, ver: string) => {
  const resp = useRequest(fetchFileList, {
    manual: true,
  });

  useEffect(() => {
    const name = pkgName.trim();
    if (!validate(name)) {
      resp.mutate({ files: [], info: {} });
      return;
    }
    if (!ver) return;
    resp.run({
      name: name,
      ver: ver.trim(),
    });
  }, [pkgName, ver, resp.run, resp.mutate]);

  return resp;
};

export const usePkgVesions = (pkgName: string) => {
  const resp = useRequest(fetchVersions, {
    manual: true,
  });

  useEffect(() => {
    const name = pkgName?.trim();
    if (!validate(name)) {
      resp.mutate({ tags: {}, versions: [] });
      return;
    }
    resp.run(pkgName.trim());
  }, [pkgName, resp.run, resp.mutate]);

  return resp;
};
