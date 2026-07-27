export const WINNER_DETECTION_RESULT = {
  DRAW: "### draw ###",
  HOST_WON: "### host won ###",
  GUEST_WON: "### guest won ###",
} as const;

export type WinnerDetectionResultId =
  (typeof WINNER_DETECTION_RESULT)[keyof typeof WINNER_DETECTION_RESULT];

export function isWinnerDetectionResult(value: unknown): value is WinnerDetectionResultId {
  return (
    value === WINNER_DETECTION_RESULT.DRAW ||
    value === WINNER_DETECTION_RESULT.HOST_WON ||
    value === WINNER_DETECTION_RESULT.GUEST_WON
  );
}
