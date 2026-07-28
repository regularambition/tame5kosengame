export const WINNER_DETECTION_RESULT = {
    DRAW: "### draw ###",
    HOST_WON: "### host won ###",
    GUEST_WON: "### guest won ###",
};
export function isWinnerDetectionResult(value) {
    return (value === WINNER_DETECTION_RESULT.DRAW ||
        value === WINNER_DETECTION_RESULT.HOST_WON ||
        value === WINNER_DETECTION_RESULT.GUEST_WON);
}
