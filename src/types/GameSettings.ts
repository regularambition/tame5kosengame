export type GameSettings = {
  highlightHand: boolean;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  highlightHand: true,
};

export const GAME_SETTINGS_STORAGE_KEY = "gameSettings";
