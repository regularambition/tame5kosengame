import {Button} from "../components/ui/Button";
import {ButtonRow} from "../components/ui/ButtonRow";

import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";

type TopScreenProps = {
  onEntranceClick: () => void;
  onRulesClick: () => void;
  onSettingsClick: () => void;
  onUserNameClick: () => void;
  onCreditClick: () => void;
};

export function TopScreen({
  onEntranceClick,
  onRulesClick,
  onSettingsClick,
  onUserNameClick,
  onCreditClick,
}: TopScreenProps) {
  return (
    <main className="screen top-screen">
      <ScreenBanner s={SCREEN_NAMES.TOP} />
      <ButtonRow>
        <Button type="button">自分が部屋を建てる</Button>
        <Button onClick={onEntranceClick} type="button">
          他の人が建てた部屋に入る
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
