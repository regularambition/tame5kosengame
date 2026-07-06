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
};

export function TopScreen({
  onRandomMatchClick,
  onPrivateMatchClick,
  onRulesClick,
  onSettingsClick,
  onUserNameClick,
  onCreditClick,
}: TopScreenProps) {
  return (
    <main className="screen centering top-screen">
      <ScreenBanner s={SCREEN_NAMES.TOP} />
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
          ゲームのルールを確認
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
