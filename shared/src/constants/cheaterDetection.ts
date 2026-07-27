export const CHEATER_DETECTION_RESULT = {
  HOST_USED_CHEATING: "### host used cheating ###",
  GUEST_USED_CHEATING: "### guest used cheating ###",
} as const;

export type CheaterDetectionResultId =
  (typeof CHEATER_DETECTION_RESULT)[keyof typeof CHEATER_DETECTION_RESULT];
