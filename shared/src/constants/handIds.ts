export const HAND_IDS = {
  ATTACK: "attack",
  BEAM: "beam",
  CHARGE: "charge",
  DEFENSE: "defense",
} as const;

export type HandId = (typeof HAND_IDS)[keyof typeof HAND_IDS];
