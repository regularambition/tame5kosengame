import "./ScreenBanner.css";

import {Screen} from "../../constants/screenNames";

type ScreenBannerProps = {
  s: Screen;
};

export function ScreenBanner({s}: ScreenBannerProps) {
  return <span className="screen-banner">{s.name}</span>;
}
