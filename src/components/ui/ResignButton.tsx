import "./ResignButton.css";

import resignIcon from "../../assets/ui/resign_flag.png";
import {IconButton} from "./IconButton";

type RegignButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function ResignButton({onClick, disabled = false}: RegignButtonProps) {
  return (
    <IconButton
      className="resign-button"
      iconSrc={resignIcon}
      label="降参する"
      onClick={onClick}
      disabled={disabled}
    />
  );
}
