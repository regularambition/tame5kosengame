export declare const HAND_IDS: {
    readonly ATTACK: "attack";
    readonly BEAM: "beam";
    readonly CHARGE: "charge";
    readonly DEFENSE: "defense";
};
export type HandId = (typeof HAND_IDS)[keyof typeof HAND_IDS];
