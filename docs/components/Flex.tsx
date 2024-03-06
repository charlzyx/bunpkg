import React, { useMemo } from "react";

export const Flex: React.FC<
  React.PropsWithChildren<{
    flex?: React.CSSProperties["flex"];
    justify?: React.CSSProperties["justifyContent"];
    align?: React.CSSProperties["alignItems"];
    center?: boolean;
    className?: string;
  }>
> = (props) => {
  const flexProps: React.CSSProperties = useMemo(() => {
    return {
      display: "flex",
      flex: props.flex,
      justifyContent: props.justify
        ? props.justify
        : props.center
          ? "center"
          : undefined,
      alignItems: props.align
        ? props.align
        : props.center
          ? "center"
          : undefined,
    };
  }, [props]);

  return (
    <div className={props.className} style={flexProps}>
      {props.children}
    </div>
  );
};
