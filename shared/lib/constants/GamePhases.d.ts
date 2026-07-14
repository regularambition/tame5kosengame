export declare const GAME_PHASES: {
    readonly INTRO: "intro";
    readonly SELECTING: "selecting";
    readonly RESOLVED: "resolved";
    readonly FINISHED: "finished";
};
export type GamePhase = (typeof GAME_PHASES)[keyof typeof GAME_PHASES];
