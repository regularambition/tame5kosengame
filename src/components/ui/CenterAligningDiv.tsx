import "./CenterAligningDiv.css";

import type {ReactNode} from "react";

type DivProps = React.ButtonHTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

export function CenterAligningDiv({children, className = "", ...props}: DivProps) {
  return (
    <div className={`inherit-alignment ${className}`} {...props}>
      {children}
    </div>
  );
}
