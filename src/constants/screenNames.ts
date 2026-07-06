export const SCREEN_NAMES = {
  GAME_TITLE: {code: "gameTitle", name: "タイトル"} as const,
  USER_NAME: {code: "userName", name: "ユーザー名登録・変更"} as const,
  TOP: {code: "top", name: "トップ"} as const,
  SETTINGS: {code: "settings", name: "設定変更"} as const,
  RULES: {code: "rules", name: "ルール確認"} as const,
  CREDITS: {code: "credits", name: "クレジット"} as const,
  RANDOM_MATCH: {code: "randomMatch", name: "ランダムマッチ"} as const,
  PRIVATE_MATCH: {code: "privateMatch", name: "プライベートマッチ"} as const,
} as const;

export type Screen = (typeof SCREEN_NAMES)[keyof typeof SCREEN_NAMES];
