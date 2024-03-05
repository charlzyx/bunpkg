import React, { useMemo } from "react";

export const Flex: React.FC<
  React.PropsWithChildren<{
    flex?: React.CSSProperties["flex"];
    justify?: React.CSSProperties["justifyContent"];
    align?: React.CSSProperties["alignItems"];
    className?: string;
  }>
> = (props) => {
  const flexProps: React.CSSProperties = useMemo(() => {
    return {
      display: "flex",
      flex: props.flex,
      justifyContent: props.justify,
      alignItems: props.align,
    };
  }, [props]);

  return (
    <div className={props.className} style={flexProps}>
      {props.children}
    </div>
  );
};
