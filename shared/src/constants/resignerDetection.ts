export const RESIGNER_DETECTION_RESULT = {
  HOST_RESIGNED: "### host resigned ###",
  GUEST_RESIGNED: "### guest resigned ###",
} as const;

export type ResignerDetectionResultId =
  (typeof RESIGNER_DETECTION_RESULT)[keyof typeof RESIGNER_DETECTION_RESULT];

export function isResignerDetectionResult(value: unknown): value is ResignerDetectionResultId {
  return (
    value === RESIGNER_DETECTION_RESULT.HOST_RESIGNED ||
    value === RESIGNER_DETECTION_RESULT.GUEST_RESIGNED
  );
}
