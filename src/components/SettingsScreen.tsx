import {useState} from "react";

import {USER_NAME_RULES} from "@tame5kosengame/shared";
import {Button} from "../components/ui/Button";
import {ButtonRow} from "../components/ui/ButtonRow";
import {TextInput} from "../components/ui/TextInput";

import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";

type SettingsScreenProps = {
  onBack: () => void;
};

export function SettingsScreen({onBack}: SettingsScreenProps) {
  const [name, setName] = useState("");
  const [highlightOwnHand, setHighlightOwnHand] = useState(true);

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setName(event.target.value.slice(0, USER_NAME_RULES.MAX_LENGTH));
  };

  return (
    <main className="screen">
      <ScreenBanner s={SCREEN_NAMES.SETTINGS} />

      <section
        className="settings-section settings-highlight-section"
        aria-labelledby="settings-highlight-title"
      >
        <h2 className="item-title" id="settings-highlight-title">
          対戦中に自分の選択している手を強調表示
        </h2>
        <div className="settings-radio-group">
          <label className="settings-radio-label">
            <input
              checked={highlightOwnHand}
              name="highlight-own-hand"
              onChange={() => setHighlightOwnHand(true)}
              type="radio"
            />
            する
          </label>
          <label className="settings-radio-label">
            <input
              checked={!highlightOwnHand}
              name="highlight-own-hand"
              onChange={() => setHighlightOwnHand(false)}
              type="radio"
            />
            しない
          </label>
        </div>
      </section>

      <ButtonRow>
        <Button onClick={onBack} type="button">
          変更せず戻る
        </Button>
        <Button type="button">変更内容を確定</Button>
      </ButtonRow>
    </main>
  );
}
