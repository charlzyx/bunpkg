import { useDeferredValue, useState } from "react";
import { FileTable } from "./FilesTable";
import { PkgSelector } from "./PkgSelector";
import "./style.css";

export const MetaBrowser = () => {
  const [pkg, setPkg] = useState({ name: "ofetch", ver: "1.3.3" });
  const lazy = useDeferredValue(pkg);
  console.log(`🚀 ~ MetaBrowser ~ lazy:`, lazy);

  return (
    <div className="fbb">
      <PkgSelector value={pkg} onChange={setPkg}></PkgSelector>
      <FileTable pkgName={lazy.name} ver={lazy.ver}></FileTable>
    </div>
  );
};
