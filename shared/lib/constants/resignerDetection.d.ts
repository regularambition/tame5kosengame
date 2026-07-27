export declare const RESIGNER_DETECTION_RESULT: {
    readonly HOST_RESIGNED: "### host resigned ###";
    readonly GUEST_RESIGNED: "### guest resigned ###";
};
export type ResignerDetectionResultId = (typeof RESIGNER_DETECTION_RESULT)[keyof typeof RESIGNER_DETECTION_RESULT];
export declare function isResignerDetectionResult(value: unknown): value is ResignerDetectionResultId;
