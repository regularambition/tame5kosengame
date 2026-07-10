import "./ScreenBanner.css";

import {Screen, SCREEN_NAMES} from "../../constants/screenNames";

type ScreenBannerProps = {
  s: Screen;
  userName?: string;
};

export function ScreenBanner({s, userName = ""}: ScreenBannerProps) {
  return (
    <span className="screen-banner">
      {s}
      {s == SCREEN_NAMES.TOP && `（ログイン中のユーザー：${userName}）`}
    </span>
  );
}
