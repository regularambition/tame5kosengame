import {ReactNode} from "react";

type AnnotationTextProps = {
  children: ReactNode;
};

export function AnnotationText({children}: AnnotationTextProps) {
  return <p className="error-and-annotation">{children}</p>;
}
