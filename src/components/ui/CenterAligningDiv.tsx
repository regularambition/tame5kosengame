import "./CenterAligningDiv.css";

import type {ReactNode} from "react";

type DivProps = {
  children: ReactNode;
  className?: string;
};

export function CenterAligningDiv({children, className = "", ...props}: DivProps) {
  return (
    <div className={`vertical-alignment horizontal-centering ${className}`} {...props}>
      {children}
    </div>
  );
}
