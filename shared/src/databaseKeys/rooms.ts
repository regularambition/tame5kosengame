import {ROOT_KEYS} from "./root.js";

export const GENERAL_ROOM_KEYS = {
  CREATED_AT: "createdAt",
  RULES: "rules",
  MATCH_POINT: "matchPoint",
  THINKING_TIME_IN_SEC: "thinkingTimeInSec",
  STATE: "state",
  UID: "uid",
  NAME: "name",
  SCORE: "score",
  MANA: "mana",
  HAS_FINISHED_INTRO: "hasFinishedIntro",
  GAME: "game",
  PHASE: "phase",
  HAND_SUBMISSION_DEADLINE: "handSubmissionDeadline",
  RECONNECT_DEADLINE: "reconnectDeadline",
  SUBMITTED_PLAYERS: "submittedPlayers",
  ROUND_NUMBER: "roundNumber",
  HANDS_OF: "handsOf",
} as const;

export const PRIVATE_ROOM_KEYS = {
  HOST: "host",
  GUEST: "guest",
  SPECTATORS: "spectators",
  JOIN_CODE_HASH: "joinCodeHash",
  READY: "ready",
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

  privateRoomGuestName: (roomId: string) =>
    `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${PRIVATE_ROOM_KEYS.GUEST}/${GENERAL_ROOM_KEYS.NAME}`,

  privateRoomGuestScore: (roomId: string) =>
    `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${PRIVATE_ROOM_KEYS.GUEST}/${GENERAL_ROOM_KEYS.SCORE}`,

  privateRoomHostScore: (roomId: string) =>
    `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${PRIVATE_ROOM_KEYS.HOST}/${GENERAL_ROOM_KEYS.SCORE}`,

  privateRoomSpectator: (roomId: string, uid: string) =>
    `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}/${PRIVATE_ROOM_KEYS.SPECTATORS}/${uid}`,

  gamePhase: (roomId: string, isPrivateMatch: boolean = false) =>
    `${isPrivateMatch ? ROOT_KEYS.PRIVATE_ROOMS : ROOT_KEYS.RANDOM_ROOMS}/${roomId}/${GENERAL_ROOM_KEYS.GAME}/${GENERAL_ROOM_KEYS.PHASE}`,

  handSubmissionDeadline: (roomId: string, isPrivateMatch: boolean = false) =>
    `${isPrivateMatch ? ROOT_KEYS.PRIVATE_ROOMS : ROOT_KEYS.RANDOM_ROOMS}/${roomId}/${GENERAL_ROOM_KEYS.GAME}/${GENERAL_ROOM_KEYS.HAND_SUBMISSION_DEADLINE}`,

  privateRoomJoinCode: (joinCodeHash: string) =>
    `${ROOT_KEYS.PRIVATE_ROOM_JOIN_CODES}/${joinCodeHash}`,

  privateRoomJoinCodeRoomId: (joinCodeHash: string) =>
    `${ROOT_KEYS.PRIVATE_ROOM_JOIN_CODES}/${joinCodeHash}/${PRIVATE_ROOM_JOIN_CODE_KEYS.ROOM_ID}`,

  privateRoomHiddenHand: (roomId: string, roundNumber: number) =>
    `${ROOT_KEYS.PRIVATE_ROOM_HIDDEN_HAND}/${roomId}/${roundNumber}`,
} as const;
