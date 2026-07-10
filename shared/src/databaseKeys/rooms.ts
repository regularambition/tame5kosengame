import {ROOT_KEYS} from "./root.js";

export const GENERAL_ROOM_KEYS = {
  CREATED_AT: "createdAt",
  RULES: "rules",
  MATCH_POINT: "matchPoint",
  THINKING_TIME_IN_SEC: "thinkingTimeInSec",
  STATE: "state",
} as const;

export const PRIVATE_ROOM_KEYS = {
  HOST_UID: "hostUid",
  GUEST_UID: "guestUid",
  SPECTATORS: "spectators",
  JOIN_CODE_HASH: "joinCodeHash",
} as const;

export const PRIVATE_ROOM_JOIN_CODE_KEYS = {
  ROOM_ID: "roomId",
  CREATED_AT: "createdAt",
} as const;

export const DATABASE_PATHS_FOR_ROOMS = {
  privateRoomsRoot: () => ROOT_KEYS.PRIVATE_ROOMS,

  privateRoom: (roomId: string) => `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}`,

  privateRoomState: (roomId: string) =>
    `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${GENERAL_ROOM_KEYS.STATE}`,

  privateRoomGuestUid: (roomId: string) =>
    `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${PRIVATE_ROOM_KEYS.GUEST_UID}`,

  privateRoomSpectator: (roomId: string, uid: string) =>
    `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${PRIVATE_ROOM_KEYS.SPECTATORS}/${uid}`,

  privateRoomJoinCode: (joinCodeHash: string) =>
    `${ROOT_KEYS.PRIVATE_ROOM_JOIN_CODES}/${joinCodeHash}`,

  privateRoomJoinCodeRoomId: (joinCodeHash: string) =>
    `${ROOT_KEYS.PRIVATE_ROOM_JOIN_CODES}/${joinCodeHash}/${PRIVATE_ROOM_JOIN_CODE_KEYS.ROOM_ID}`,
} as const;
