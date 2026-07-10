export const SCREEN_NAMES = {
  GAME_TITLE: "タイトル" as const,
  USER_NAME: "ユーザー名登録・変更" as const,
  TOP: "トップ" as const,
  SETTINGS: "設定変更" as const,
  HOW_TO_PLAY: "遊び方" as const,
  CREDITS: "クレジット" as const,
  RANDOM_MATCH: "ランダムマッチ" as const,
  PRIVATE_MATCH: "プライベートマッチ" as const,
} as const;

export type Screen = (typeof SCREEN_NAMES)[keyof typeof SCREEN_NAMES];
