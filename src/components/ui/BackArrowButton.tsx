import "./BackArrowButton.css";

import backArrowIcon from "../../assets/ui/backArrowIcon.png";
import {IconButton} from "./IconButton";

export function BackArrowButton({onClick = () => {}}) {
  return (
    <IconButton
      className="back-arrow-button"
      iconSrc={backArrowIcon}
      label="前の画面へ戻る"
      onClick={onClick}
    />
  );
}
