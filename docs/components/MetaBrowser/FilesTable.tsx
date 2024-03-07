import React, { MouseEventHandler, useMemo } from "react";
import { Loading } from "../Loading";
import { usePrefixData } from "./hooks";
import "./style.css";
import { usePkgFileList } from "./useApi";
import { Tooltip } from "react-tooltip";
import { Icons } from "../Icons";
import toast, { Toaster } from "react-hot-toast";
import { Flex } from "../Flex";

// https://stackoverflow.com/questions/51805395/navigator-clipboard-is-undefined
const copy = (text: string) => {
  // Navigator clipboard api needs a secure context (https)
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    // Use the 'out of viewport hidden text area' trick
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Move textarea out of the viewport so it's not visible
    textArea.style.position = "absolute";
    textArea.style.left = "-999999px";

    document.body.prepend(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
    } catch (error) {
      console.error(error);
    } finally {
      textArea.remove();
    }
  }
};

const useLinks = (link: string) => {
  return useMemo(() => {
    const segs = link.split("/").filter(Boolean);
    return segs.reduce<React.ReactNode[]>((list, item, idx) => {
      const isLast = idx === segs.length - 1;
      const dataPath = segs
        .slice(0, idx + 1)
        .concat("")
        .join("/");

      list.push(
        !isLast ? (
          <span key={dataPath} className="link" data-link={dataPath}>
            {item}/
          </span>
        ) : (
          <span key={dataPath}>{item}</span>
        ),
      );
      return list;
    }, []);
  }, [link]);
};

const Nav = (props: { link: string; onClickLink: (link: string) => void }) => {
  const links = useLinks(props.link);
  const click: MouseEventHandler<HTMLDivElement> = (event) => {
    const maybe = event.target as HTMLSpanElement;
    if (maybe.dataset.link) {
      props.onClickLink(maybe.dataset.link);
    }
  };

  return (
    <div onClick={click} className="nav">
      {links}
    </div>
  );
};

export const FileTable = (props: {
  pkgName: string;
  ver: string;
}) => {
  const resp = usePkgFileList(props.pkgName, props.ver);

  const pkgSpec = `${props.pkgName}@${props.ver}`;
  const [page, prefix, setPrefix] = usePrefixData(resp.data?.files, pkgSpec);

  const onClick: MouseEventHandler = (e) => {
    const maybe = e.target as HTMLTableCellElement;
    const info = maybe?.dataset;
    if (info.copy) {
      const link = info.copy;
      copy(link);
      toast.success(`Copy Link Success!`);
      if (!info.onlycopy) {
        window.open(link, link);
      }
    }
    if (info.dir) {
      setPrefix((p) => `${p}${info.dir}/`);
    }
  };

  return (
    <div className="file-table-box">
      <div className="nav-box">
        <Flex justify="space-between">
          <Nav link={prefix} onClickLink={setPrefix}></Nav>
          <div>@{resp?.data?.info?.version}</div>
        </Flex>
      </div>
      <Loading resp={resp} empty={props.pkgName ? "" : "Empty"}>
        <table className="file-table">
          <tbody onClick={onClick}>
            {page.map((item) => {
              return (
                <tr className="tr" key={item.name}>
                  <td
                    align="left"
                    data-dir={item.isDir ? item.name : null}
                    className={item.isDir ? "link" : ""}
                  >
                    {item.name}
                    {item.isDir ? null : (
                      <React.Fragment>
                        &nbsp;&nbsp;
                        <Icons
                          className="tooltip-copy"
                          data-tooltip-content={`Click to Copy ${item.npm}`}
                          data-tooltip-place="top"
                          data-onlycopy
                          icon="copy"
                          copy={item.npm}
                        ></Icons>
                      </React.Fragment>
                    )}
                  </td>
                  <td
                    data-copy={item.isDir ? null : item.npm}
                    className="link"
                    width={48}
                  >
                    {item.isDir ? null : (
                      <Icons
                        className="tooltip-npm"
                        data-tooltip-content={item.npm}
                        data-tooltip-place="top"
                        icon="link"
                        copy={item.npm}
                      ></Icons>
                    )}
                  </td>
                  <td
                    data-copy={item.isDir ? null : item.esm}
                    className="link"
                    width={48}
                  >
                    {item.isDir ? null : (
                      <Icons
                        className="tooltip-npm"
                        data-tooltip-content={item.esm}
                        data-tooltip-place="top"
                        icon="esm"
                        copy={item.esm}
                      ></Icons>
                    )}
                  </td>
                  <td width={80} align="right">
                    {item.size}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Loading>
      <Toaster></Toaster>
      <Tooltip anchorSelect=".tooltip-copy" clickable></Tooltip>
      <Tooltip anchorSelect=".tooltip-npm" clickable></Tooltip>
      <Tooltip anchorSelect=".tooltip-esm" clickable></Tooltip>
    </div>
  );
};
