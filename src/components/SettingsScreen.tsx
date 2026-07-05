import {useState} from "react";

import {USER_NAME_RULES} from "@tame5kosengame/shared";
import {IconButton} from "../components/ui/IconButton";
import {Button} from "../components/ui/Button";
import {ButtonRow} from "../components/ui/ButtonRow";
import {CenterAligningDiv} from "../components/ui/CenterAligningDiv";

import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";

type SettingsScreenProps = {
  onBack: () => void;
};

const iconModules = import.meta.glob("../assets/icons/icon*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const USER_ICONS = Array.from({length: 12}, (_, index) => {
  const iconNumber = index + 1;

  return {
    id: `icon-${iconNumber}`,
    label: `アイコン${iconNumber}`,
    src: iconModules[`../assets/icons/icon${iconNumber}.png`] as string,
  };
});

export function SettingsScreen({onBack}: SettingsScreenProps) {
  const [name, setName] = useState("");
  const [selectedIconId, setSelectedIconId] = useState(USER_ICONS[0].id);
  const [highlightOwnHand, setHighlightOwnHand] = useState(true);

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setName(event.target.value.slice(0, USER_NAME_RULES.MAX_LENGTH));
  };

  return (
    <main className="screen">
      {/* <h1 className="screen-title">設定変更</h1> */}
      <ScreenBanner s={SCREEN_NAMES.SETTINGS} />

      {/* <section
        className="settings-section settings-name-section"
        aria-labelledby="settings-name-title"
      >
        <h2 className="settings-section-title" id="settings-name-title">
          ユーザー名変更
        </h2>
        <p className="settings-note">
          ※1文字以上16文字以下の半角英大文字・小文字・
          <br />
          アラビア数字でのみ入力可能
        </p>
        <input
          aria-label="ユーザー名変更"
          className="settings-name-input"
          maxLength={USER_NAME_RULES.MAX_LENGTH}
          onChange={handleNameChange}
          placeholder="入力値が空でなければ更新されます"
          type="text"
          value={name}
        />
      </section> */}
      <CenterAligningDiv>
        <h2 className="settings-section-title" id="settings-name-title">
          ユーザー名変更
        </h2>
        <p className="settings-note">
          ※1文字以上16文字以下の半角英大文字・小文字・アラビア数字でのみ入力可能
        </p>
        <input
          aria-label="ユーザー名変更"
          className="settings-name-input"
          maxLength={USER_NAME_RULES.MAX_LENGTH}
          onChange={handleNameChange}
          placeholder="入力値が空でない場合のみ更新されます"
          type="text"
          value={name}
        />
      </CenterAligningDiv>

      <section
        className="settings-section settings-icon-section"
        aria-labelledby="settings-icon-title"
      >
        <h2 className="settings-section-title" id="settings-icon-title">
          アイコン変更
        </h2>
        <div className="settings-icon-grid">
          {USER_ICONS.map((icon) => (
            <IconButton
              aria-pressed={selectedIconId === icon.id}
              className="settings-icon-button"
              data-selected={selectedIconId === icon.id}
              iconSrc={icon.src}
              key={icon.id}
              label={icon.label}
              onClick={() => setSelectedIconId(icon.id)}
            />
          ))}
        </div>
      </section>

      <section
        className="settings-section settings-highlight-section"
        aria-labelledby="settings-highlight-title"
      >
        <h2 className="settings-section-title" id="settings-highlight-title">
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
