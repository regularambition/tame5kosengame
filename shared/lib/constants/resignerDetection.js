export const RESIGNER_DETECTION_RESULT = {
    HOST_RESIGNED: "### host resigned ###",
    GUEST_RESIGNED: "### guest resigned ###",
};
export function isResignerDetectionResult(value) {
    return (value === RESIGNER_DETECTION_RESULT.HOST_RESIGNED ||
        value === RESIGNER_DETECTION_RESULT.GUEST_RESIGNED);
}
