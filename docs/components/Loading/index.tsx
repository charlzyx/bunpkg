import { useMap, type useRequest } from "ahooks";

import "./style.css";
import { useMemo } from "react";

export const Loading: React.FC<
  React.PropsWithChildren<{
    resp: ReturnType<typeof useRequest>;
    empty?: string;
  }>
> = (props) => {
  const { loading, error, refresh } = props.resp;

  const sty = useMemo(() => {
    const opacity = loading || error ? 0.4 : 1;
    return { opacity };
  }, [loading, error]);

  return (
    <div className="loading-box" style={sty}>
      {props.empty ? (
        props.empty
      ) : loading ? (
        <div className="hint">Loading...</div>
      ) : error ? (
        <div>
          Err[{(error as any)?.status || error.message}]&nbsp;
          <span className="hint link" onClick={() => refresh()}>
            Click to Retry
          </span>
        </div>
      ) : (
        props.children
      )}
    </div>
  );
};
