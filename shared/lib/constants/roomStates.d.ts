export declare const ROOM_STATES: {
    readonly PREPARING: "preparing";
    readonly PLAYING: "playing";
    readonly RECONNECT_GRACE: "reconnectGrace";
    readonly REMATCH_CHOICE: "rematchChoice";
    readonly CLOSED: "closed";
};
export type RoomState = (typeof ROOM_STATES)[keyof typeof ROOM_STATES];
