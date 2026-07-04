type TopScreenProps = {
  onRulesClick: () => void;
  onSettingsClick: () => void;
};

export function TopScreen({onRulesClick, onSettingsClick}: TopScreenProps) {
  return (
    <main className="screen top-screen">
      <button className="menu-button" type="button">
        自分が部屋を建てる
      </button>
      <button className="menu-button" type="button">
        他の人が建てた部屋に入る
      </button>
      <button className="menu-button" onClick={onRulesClick} type="button">
        ルールを確認
      </button>
      <button className="menu-button" onClick={onSettingsClick} type="button">
        設定の変更
      </button>
    </main>
  );
}
