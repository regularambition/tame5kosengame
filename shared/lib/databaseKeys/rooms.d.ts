export declare const GENERAL_ROOM_KEYS: {
    readonly CREATED_AT: "createdAt";
    readonly RULES: "rules";
    readonly MATCH_POINT: "matchPoint";
    readonly THINKING_TIME_IN_SEC: "thinkingTimeInSec";
    readonly STATE: "state";
};
export declare const PRIVATE_ROOM_KEYS: {
    readonly HOST_UID: "hostUid";
    readonly GUEST_UID: "guestUid";
    readonly SPECTATORS: "spectators";
    readonly JOIN_CODE_HASH: "joinCodeHash";
};
export declare const PRIVATE_ROOM_JOIN_CODE_KEYS: {
    readonly ROOM_ID: "roomId";
    readonly CREATED_AT: "createdAt";
};
export declare const DATABASE_PATHS: {
    readonly privateRoomsRoot: () => "privateRooms";
    readonly privateRoom: (roomId: string) => string;
    readonly privateRoomState: (roomId: string) => string;
    readonly privateRoomGuestUid: (roomId: string) => string;
    readonly privateRoomSpectator: (roomId: string, uid: string) => string;
    readonly privateRoomJoinCode: (joinCodeHash: string) => string;
    readonly privateRoomJoinCodeRoomId: (joinCodeHash: string) => string;
};
