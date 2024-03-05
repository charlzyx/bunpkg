import { ofetch } from "ofetch";
import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Flex } from "../Flex";
import { useControllableValue, useRequest } from "ahooks";
import { usePkgFileList, usePkgVesions } from "./useApi";
import { usePrefixData } from "./hooks";
import "./style.css";

const VersionSelector = (props: {
  pkg: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const data = usePkgVesions(props.pkg);

  const [ver, setVer] = useControllableValue(props);

  return (
    <select className="select" value={ver} onChange={(x) => setVer(x)}>
      {data?.map((ver) => (
        <option key={ver} label={ver}>
          {ver}
        </option>
      ))}
    </select>
  );
};

const Nav = (props: { link: string; onClickLink: (link: string) => void }) => {
  const links = useMemo(() => {
    const segs = props.link.split("/").filter(Boolean);
    return segs.reduce<React.ReactNode[]>((list, item, idx) => {
      const isLast = idx === segs.length - 1;
      let onClick = undefined;
      if (!isLast) {
        onClick = () =>
          props.onClickLink(
            segs
              .slice(0, idx + 1)
              .concat("")
              .join("/"),
          );
      }

      const cls = onClick ? "link" : undefined;

      list.push(
        <span className={cls} onClick={onClick}>
          {item}
          {isLast ? "" : "/"}
        </span>,
      );
      return list;
    }, []);
  }, [props.link]);

  return <div className="nav">{links}</div>;
};

const FileTable = (props: {
  pkg: string;
  ver: string;
}) => {
  const data = usePkgFileList(props.pkg, props.ver);

  const [page, prefix, setPrefix] = usePrefixData(data!);

  return (
    <React.Fragment>
      <div className="box">
        <div className="header">
          <Nav link={prefix} onClickLink={setPrefix}></Nav>
        </div>

        <table className="table">
          <tbody>
            {page.map((item) => {
              return (
                <tr className="tr" key={item.name}>
                  <td
                    align="left"
                    onClick={() => {
                      if (item.isDir) {
                        setPrefix((p) => `${p}${item.name}/`);
                      }
                    }}
                    className={item.isDir ? "link" : ""}
                  >
                    {item.name}
                  </td>
                  <td align="right">{item.size}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
};

export const MetaBrowser = () => {
  const [pkg, setPkg] = useState("react");
  const [ver, setVer] = useState("18.2.0");
  const defered = useDeferredValue(pkg);

  return (
    <div className="fbb">
      <Flex className="search" flex={1} justify="space-between">
        <input
          className="input"
          value={pkg}
          onChange={(e) => setPkg(e.target.value)}
          placeholder="package name"
        ></input>
        <VersionSelector
          pkg={defered}
          value={ver}
          onChange={setVer}
        ></VersionSelector>
      </Flex>
      <FileTable pkg={pkg} ver={ver}></FileTable>
    </div>
  );
};
