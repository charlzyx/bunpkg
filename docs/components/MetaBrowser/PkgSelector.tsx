import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Flex } from "../Flex";
import { Loading } from "../Loading";
import "./style.css";
import { usePkgVesions } from "./useApi";
import { Icons } from "../Icons";
import { useDebounce } from "ahooks";

const withTag = (ver: string, tags?: Record<string, string>) => {
  if (!tags) return "";
  const has = Object.keys(tags).find((tag) => tags[tag] === ver);
  return has ? `${ver}@${has}` : ver;
};

export const PkgSelector = (props: {
  value: {
    name: string;
    ver: string;
  };
  onChange: (neo: { name: string; ver: string }) => void;
}) => {
  const [name, setName] = useState(props.value.name);
  const [ver, setVer] = useState(props.value.ver);
  const [kw, setKw] = useState("");

  const filterKw = useDeferredValue(kw);
  const pkgName = useDeferredValue(name);
  const pkgVer = useDeferredValue(ver);

  const resp = usePkgVesions(pkgName);

  const versions = useMemo(() => {
    const list = resp.data?.versions ?? [];
    return filterKw.trim()
      ? list.reduce<string[]>((list, x) => {
          const match = withTag(x, resp.data?.tags).includes(filterKw.trim());
          if (match) {
            list.push(x);
          }
          return list;
        }, [])
      : list;
  }, [resp.data?.versions, filterKw]);

  const lazy = useDebounce(versions, {
    maxWait: 300,
  });

  useEffect(() => {
    if (resp.data) {
      if (resp.data?.tags) {
        setVer(resp.data.tags?.latest);
      }
    }
  }, [pkgName, resp.data?.tags]);

  useEffect(() => {
    setVer((ver) => {
      if (lazy.includes(ver)) return ver;
      return lazy[0];
    });
  }, [lazy]);

  useEffect(() => {
    props.onChange({ name: pkgName, ver: pkgVer });
  }, [pkgName, pkgVer, props.onChange]);

  return (
    <Flex className="pkg-selector" justify="space-between">
      <Flex center>
        <Icons large icon="search"></Icons> &nbsp;
        <input
          // biome-ignore lint/a11y/noAutofocus: <explanation>
          autoFocus
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="package name"
        ></input>
      </Flex>
      <Flex center>
        <Icons large icon="aiming"></Icons> &nbsp;
        <input
          className="filter"
          type="text"
          placeholder="Filter"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <Loading resp={resp} empty={pkgName ? "" : "Empty"}>
          <select
            className="select"
            value={ver}
            onChange={(e) => setVer(e.target.value)}
          >
            {versions?.map((ver) => (
              <option
                key={`${pkgName}-${ver}`}
                label={withTag(ver, resp.data?.tags)}
                value={ver}
              ></option>
            ))}
          </select>
        </Loading>
      </Flex>
    </Flex>
  );
};
