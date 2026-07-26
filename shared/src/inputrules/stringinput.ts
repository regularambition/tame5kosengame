export const USER_NAME_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 16,
  CHAR_CLASS: "[A-Za-z0-9ぁ-んァ-ヶー一-龯]",
} as const;

export const JOIN_CODE_RULES = {
  LENGTH: 8,
  CHAR_CLASS: "[0-9]",
} as const;

export const PUSH_ID_RULES = {
  LENGTH: 20,
  CHAR_CLASS: "[-0-9A-Z_a-z]",
} as const;
