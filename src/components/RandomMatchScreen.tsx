import {useState} from "react";

import {BackArrowButton} from "./ui/BackArrowButton";
import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";
import {GameRuleDescription} from "./ui/GameRuleDescription";

type RandomMatchScreenProps = {
  onBackToTop: () => void;
};

export function RandomMatchScreen({onBackToTop}: RandomMatchScreenProps) {
  return (
    <main className="screen centering not-playing-text-general">
      <ScreenBanner s={SCREEN_NAMES.RANDOM_MATCH} />
      <BackArrowButton onClick={onBackToTop} />

      <GameRuleDescription />
      <p>相手を探しています・・・</p>
    </main>
  );
}
