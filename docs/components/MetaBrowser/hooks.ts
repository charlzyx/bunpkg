import { useMemo, useState } from "react";
const humanSize = (x?: number) => {
  return x ? `${(x / Math.pow(2, 10)).toFixed(2)} KiB` : "-";
};

export const usePrefixData = (
  data?: { name: string; size: number }[],
  pkgSpec?: string,
) => {
  const [prefix, setPrefix] = useState("package/");

  const page = useMemo(() => {
    if (!data) return [];
    return data?.reduce<
      {
        name: string;
        size: string;
        isDir: boolean;
        npm?: string;
        esm?: string;
      }[]
    >((list, item) => {
      const isSub = item.name.startsWith(prefix);
      if (isSub) {
        const fileName = item.name.replace(prefix, "");
        const isChild = fileName.split("/").length <= 1;
        const npm =
          window.location.origin +
          `${prefix}${fileName}`.replace("package", `/npm/${pkgSpec!}`);

        const esm =
          window.location.origin +
          `${prefix}${fileName}`.replace("package", `/esm/${pkgSpec!}`);

        if (isChild) {
          list.push({
            name: fileName,
            size: humanSize(item.size),
            npm,
            esm,
            isDir: false,
          });
        } else {
          const dirName = fileName.split("/")[0];
          const has = list.find((x) => x.name === dirName);
          if (!has) {
            list.unshift({
              name: dirName,
              size: "-",
              isDir: true,
            });
          }
        }
      }
      return list;
    }, []);
  }, [data, prefix]);

  return [page, prefix, setPrefix] as const;
};
