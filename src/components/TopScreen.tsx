import {Button} from "./ui/Button";
import {ButtonRow} from "./ui/ButtonRow";

import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";

type TopScreenProps = {
  onRandomMatchClick: () => void;
  onPrivateMatchClick: () => void;
  onRulesClick: () => void;
  onSettingsClick: () => void;
  onUserNameClick: () => void;
  onCreditClick: () => void;
  userName: string;
};

export function TopScreen({
  onRandomMatchClick,
  onPrivateMatchClick,
  onRulesClick,
  onSettingsClick,
  onUserNameClick,
  onCreditClick,
  userName,
}: TopScreenProps) {
  return (
    <main className="screen using-full-height vertical-alignment horizontal-centering vertical-centering">
      <ScreenBanner s={SCREEN_NAMES.TOP} userName={userName} />
      <ButtonRow>
        <Button onClick={onRandomMatchClick} type="button">
          ランダムマッチ
        </Button>
        <Button onClick={onPrivateMatchClick} type="button">
          プライベートマッチ
        </Button>
      </ButtonRow>

      <ButtonRow>
        <Button onClick={onRulesClick} type="button">
          遊び方
        </Button>
        <Button onClick={onSettingsClick} type="button">
          設定の変更
        </Button>
      </ButtonRow>

      <ButtonRow>
        <Button onClick={onUserNameClick} type="button">
          ユーザー名変更
        </Button>
        <Button onClick={onCreditClick} type="button">
          クレジット
        </Button>
      </ButtonRow>
    </main>
  );
}
