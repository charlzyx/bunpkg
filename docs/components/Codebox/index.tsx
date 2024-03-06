import React, { useEffect, useRef, useState } from "react";
import "./style.css";

const holder = "https://bunpkg.com";
const relink = (div?: HTMLDivElement | null) => {
  if (!div) return;
  div.querySelectorAll("a").forEach((link) => {
    const is = link.href.startsWith(holder);
    if (is) {
      link.href = link.href.replace(holder, window.location.origin);
      link.innerHTML = link.innerHTML.replace(holder, window.location.origin);
    }
  });
};

export const Codebox: React.FC<{ title: string; children: string }> = (
  props,
) => {
  const [box, setBox] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    relink(box);
  }, [box]);

  return (
    <div ref={(dom) => setBox(dom)} className="code-box">
      <div className="code-title">{props.title}</div>
      <pre className="code-body">{props.children}</pre>
    </div>
  );
};
