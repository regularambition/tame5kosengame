import "./BackArrowButton.css";

import backArrowIcon from "../../assets/ui/backArrowIcon.png";
import {IconButton} from "./IconButton";

type BackArrowButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function BackArrowButton({onClick, disabled = false}: BackArrowButtonProps) {
  return (
    <IconButton
      className="back-arrow-button"
      iconSrc={backArrowIcon}
      label="前の画面へ戻る"
      onClick={onClick}
      disabled={disabled}
    />
  );
}
