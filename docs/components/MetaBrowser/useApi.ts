import { useRequest } from "ahooks";
import { ofetch } from "ofetch";
import { useEffect } from "react";

const fetchFileList = (pkg: { name: string; ver: string }): Promise<
  { name: string; size: number }[]
> => ofetch(`/meta/${pkg.name}@${pkg.ver}`);

const fetchVersions = (pkg: string): Promise<string[]> =>
  ofetch(`/meta/${pkg}?versions`);

export const usePkgFileList = (pkg: string, ver: string) => {
  const { data, error, loading, run } = useRequest(fetchFileList, {
    manual: true,
  });

  useEffect(() => {
    if (!pkg) return;
    run({
      name: pkg.trim(),
      ver: ver ? ver.trim() : ver,
    });
  }, [pkg, ver]);

  return data;
};

export const usePkgVesions = (pkg: string) => {
  const { data, error, loading, run } = useRequest(fetchVersions, {
    manual: true,
  });

  useEffect(() => {
    if (pkg.trim()) {
      run(pkg.trim());
    }
  }, [pkg]);

  return data;
};
