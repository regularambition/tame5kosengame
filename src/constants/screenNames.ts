export const SCREEN_NAMES = {
  GAME_TITLE: {code: "gameTitle", name: "タイトル"} as const,
  USER_NAME: {code: "userName", name: "ユーザー名登録"} as const,
  TOP: {code: "top", name: "トップ"} as const,
  SETTINGS: {code: "settings", name: "設定変更"} as const,
  RULES: {code: "rules", name: "ルール確認"} as const,
  ENTRANCE: {code: "entrance", name: "部屋タイプ選択"} as const,
} as const;

export type Screen = (typeof SCREEN_NAMES)[keyof typeof SCREEN_NAMES];
