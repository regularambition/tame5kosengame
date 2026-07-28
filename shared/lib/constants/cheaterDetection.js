export const CHEATER_DETECTION_RESULT = {
    HOST_USED_CHEATING: "### host used cheating ###",
    GUEST_USED_CHEATING: "### guest used cheating ###",
};
export function isCheaterDetectionResult(value) {
    return (value === CHEATER_DETECTION_RESULT.HOST_USED_CHEATING ||
        value === CHEATER_DETECTION_RESULT.GUEST_USED_CHEATING);
}
