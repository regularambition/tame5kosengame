import "./TextInput.css";

import React from "react";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {};

export function TextInput({...props}: TextInputProps) {
  return <input className="text-input" {...props} />;
}
