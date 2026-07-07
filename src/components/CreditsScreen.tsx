import "./CreditsScreen.css";

import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";
import {BackArrowButton} from "./ui/BackArrowButton";

type CreditsScreenProps = {
  onBackToTop: () => void;
};

export function CreditsScreen({onBackToTop}: CreditsScreenProps) {
  return (
    <main className="screen using-full-height vertical-alignment horizontal-centering vertical-centering credits-screen">
      <ScreenBanner s={SCREEN_NAMES.CREDITS} />
      <BackArrowButton onClick={onBackToTop} />
      <span>ニコニコモンズ</span>
      <ul>
        <li>nc433989</li>
        <li>nc305113</li>
        <li>nc302093</li>
        <li>nc218433</li>
        <li>nc284392</li>
      </ul>
    </main>
  );
}
