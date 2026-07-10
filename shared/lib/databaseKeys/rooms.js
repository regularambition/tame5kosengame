import { ROOT_KEYS } from "./root.js";
export const GENERAL_ROOM_KEYS = {
    CREATED_AT: "createdAt",
    RULES: "rules",
    MATCH_POINT: "matchPoint",
    THINKING_TIME_IN_SEC: "thinkingTimeInSec",
    STATE: "state",
    UID: "uid",
    NAME: "name",
};
export const PRIVATE_ROOM_KEYS = {
    HOST: "host",
    GUEST: "guest",
    SPECTATORS: "spectators",
    JOIN_CODE_HASH: "joinCodeHash",
};
export const PRIVATE_ROOM_JOIN_CODE_KEYS = {
    ROOM_ID: "roomId",
    CREATED_AT: "createdAt",
};
export const DATABASE_PATHS_FOR_ROOMS = {
    privateRoomsRoot: () => ROOT_KEYS.PRIVATE_ROOMS,
    privateRoom: (roomId) => `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}`,
    privateRoomState: (roomId) => `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${GENERAL_ROOM_KEYS.STATE}`,
    privateRoomGuestName: (roomId) => `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${PRIVATE_ROOM_KEYS.GUEST}/${GENERAL_ROOM_KEYS.NAME}`,
    privateRoomSpectator: (roomId, uid) => `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${PRIVATE_ROOM_KEYS.SPECTATORS}/${uid}`,
    privateRoomJoinCode: (joinCodeHash) => `${ROOT_KEYS.PRIVATE_ROOM_JOIN_CODES}/${joinCodeHash}`,
    privateRoomJoinCodeRoomId: (joinCodeHash) => `${ROOT_KEYS.PRIVATE_ROOM_JOIN_CODES}/${joinCodeHash}/${PRIVATE_ROOM_JOIN_CODE_KEYS.ROOM_ID}`,
};
