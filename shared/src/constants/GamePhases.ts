export const GAME_PHASES = {
  INTRO: "intro",
  SELECTING: "selecting",
  RESOLVED: "resolved",
  FINISHED: "finished",
} as const;

export type GamePhase = (typeof GAME_PHASES)[keyof typeof GAME_PHASES];
