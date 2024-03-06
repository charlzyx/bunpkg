import React, { useMemo } from "react";

const sty: React.CSSProperties = {
  display: "inline-block",
  fontSize: 0,
  width: "0.8rem",
  height: "0.8rem",
};

const large = {
  ...sty,
  width: "1rem",
  height: "1rem",
};
export const Icons = (props: {
  className?: string;
  icon: "copy" | "esm" | "link" | "search" | "aiming";
  copy?: string;
  large?: boolean;
}) => {
  return (
    <img
      {...props}
      className={props.className}
      style={props.large ? large : sty}
      data-copy={props.copy}
      src={`/icons/${props.icon}.svg`}
      alt={props.icon}
    />
  );
};
