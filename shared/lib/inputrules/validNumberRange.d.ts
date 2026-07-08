export declare const VALID_NUMBER_RANGE: {
    readonly MATCH_POINT: {
        readonly minimum: 2;
        readonly maximum: 10;
    };
    readonly THINKING_TIME: {
        readonly minimum: 3;
        readonly maximum: 30;
    };
};
export type ValidNumberRangeId = (typeof VALID_NUMBER_RANGE)[keyof typeof VALID_NUMBER_RANGE];
