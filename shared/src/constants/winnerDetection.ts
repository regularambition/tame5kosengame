export const WINNER_DETECTION_RESULT = {
  DRAW: "### draw ###",
  HOST_WON: "### host won ###",
  GUEST_WON: "### guest won ###",
} as const;

export type WinnerDetectionResultId =
  (typeof WINNER_DETECTION_RESULT)[keyof typeof WINNER_DETECTION_RESULT];
