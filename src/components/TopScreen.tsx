import {Button, BUTTON_SHAPE_TYPE} from "../components/ui/Button";
import {ButtonRow} from "../components/ui/ButtonRow";

type TopScreenProps = {
  onEntranceClick: () => void;
  onRulesClick: () => void;
  onSettingsClick: () => void;
};

export function TopScreen({onEntranceClick, onRulesClick, onSettingsClick}: TopScreenProps) {
  return (
    <main className="screen top-screen">
      {/* <button className="menu-button" type="button">
        自分が部屋を建てる
      </button>
      <button className="menu-button" onClick={onEntranceClick} type="button">
        他の人が建てた部屋に入る
      </button>
      <button className="menu-button" onClick={onRulesClick} type="button">
        ルールを確認
      </button>
      <button className="menu-button" onClick={onSettingsClick} type="button">
        設定の変更
      </button> */}
      <ButtonRow>
        <Button shapeVariant={BUTTON_SHAPE_TYPE.SQUARE} type="button">
          自分が部屋を建てる
        </Button>
        <Button shapeVariant={BUTTON_SHAPE_TYPE.SQUARE} onClick={onEntranceClick} type="button">
          他の人が建てた部屋に入る
        </Button>
      </ButtonRow>

      <ButtonRow>
        <Button shapeVariant={BUTTON_SHAPE_TYPE.SQUARE} onClick={onRulesClick} type="button">
          ゲームのルールを確認
        </Button>
        <Button shapeVariant={BUTTON_SHAPE_TYPE.SQUARE} onClick={onSettingsClick} type="button">
          設定の変更
        </Button>
      </ButtonRow>
    </main>
  );
}
