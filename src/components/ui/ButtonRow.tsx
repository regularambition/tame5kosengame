import type {ReactNode} from "react";

import "./ButtonRow.css";

type ButtonRowProps = {
  children: ReactNode;
  className?: string;
};

export function ButtonRow({children, className = ""}: ButtonRowProps) {
  return <div className={`button-row ${className}`}>{children}</div>;
}
