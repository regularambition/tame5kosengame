export declare const WINNER_DETECTION_RESULT: {
    readonly DRAW: "### draw ###";
    readonly HOST_WON: "### host won ###";
    readonly GUEST_WON: "### guest won ###";
};
export type WinnerDetectionResultId = (typeof WINNER_DETECTION_RESULT)[keyof typeof WINNER_DETECTION_RESULT];
export declare function isWinnerDetectionResult(value: unknown): value is WinnerDetectionResultId;
