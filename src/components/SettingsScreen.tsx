import {useState} from "react";

import {Button} from "./ui/Button";
import {ButtonRow} from "./ui/ButtonRow";

import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";

import {GameSettings} from "../types/GameSettings";

type SettingsScreenProps = {
  gameSettings: GameSettings;
  onChangeGameSettings: (gameSettings: GameSettings) => void;
  onBack: () => void;
};

export function SettingsScreen({gameSettings, onChangeGameSettings, onBack}: SettingsScreenProps) {
  const [draftSettings, setDraftSettings] = useState<GameSettings>(gameSettings);

  const handleChangeHighlightHand = (highlightHand: boolean) => {
    setDraftSettings((currentSettings) => ({
      ...currentSettings,
      highlightHand,
    }));
  };

  const handleConfirm = () => {
    onChangeGameSettings(draftSettings);
    onBack();
  };

  return (
    <main className="screen using-full-height vertical-alignment horizontal-centering vertical-centering not-playing-text-general">
      <ScreenBanner s={SCREEN_NAMES.SETTINGS} />

      <span id="settings-highlight-title">対戦中に自分の選択している手を強調表示</span>
      <div className="settings-radio-group">
        <label className="settings-radio-label">
          <input
            checked={draftSettings.highlightHand}
            name="highlight-own-hand"
            onChange={() => handleChangeHighlightHand(true)}
            type="radio"
          />
          する
        </label>
        <label className="settings-radio-label">
          <input
            checked={!draftSettings.highlightHand}
            name="highlight-own-hand"
            onChange={() => handleChangeHighlightHand(false)}
            type="radio"
          />
          しない
        </label>
      </div>

      <ButtonRow>
        <Button onClick={onBack}>変更せず戻る</Button>
        <Button onClick={handleConfirm}>変更内容を確定</Button>
      </ButtonRow>
    </main>
  );
}
