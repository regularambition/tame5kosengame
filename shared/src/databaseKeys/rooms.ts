import {ROOT_KEYS} from "./root.js";

export const GENERAL_ROOM_KEYS = {
  PUBLIC: "public",
  CONFIDENTIAL: "confidential",
  CREATED_AT: "createdAt",
  RULES: "rules",
  MATCH_POINT: "matchPoint",
  THINKING_TIME_IN_SEC: "thinkingTimeInSec",
  STATE: "state",
  HOST: "host",
  GUEST: "guest",
  UID: "uid",
  NAME: "name",
  SCORE: "score",
  MANA: "mana",
  HAS_FINISHED_INTERLUDE: "hasFinishedInterlude",
  FINAL_WINNER_OF_MATCH: "finalWinnerOfMatch",
  GAME: "game",
  PHASE: "phase",
  HAND_SUBMISSION_DEADLINE: "handSubmissionDeadline",
  RECONNECT_DEADLINE: "reconnectDeadline",
  SUBMITTED_PLAYERS: "submittedPlayers",
  ROUND_NUMBER: "roundNumber",
  HANDS_OF: "handsOf",
  RESOLVED_ROUND: "resolvedRound",
  MANA_GAIN: "manaGain",
  SCORE_GAIN: "scoreGain",
  SELECTED_HAND: "selectedHand",
  WINNER_OF_ROUND: "winnerOfRound",
  RESOLVED_AT: "resolvedAt",
  NEXT_PHASE_AT: "nextPhaseAt",
  CHEATER: "cheater",
  RESIGNER: "resigner",
} as const;

export const PRIVATE_ROOM_KEYS = {
  SPECTATORS: "spectators",
  JOIN_CODE_HASH: "joinCodeHash",
  READY: "ready",
  BACK_TO_LOBBY_AT: "backToLobbyAt",
  GUEST_IS_KICKED_AT: "guestIsKickedAt",
} as const;

export const PRIVATE_ROOM_JOIN_CODE_KEYS = {
  ROOM_ID: "roomId",
  CREATED_AT: "createdAt",
} as const;

export const DATABASE_PATHS_FOR_ROOMS = {
  privateRoomsRoot: () => ROOT_KEYS.PRIVATE_ROOMS,

  privateRoomContainer: (roomId: string) => `${ROOT_KEYS.PRIVATE_ROOMS}/${roomId}`,

  privateRoom: (roomId: string) =>
    `${DATABASE_PATHS_FOR_ROOMS.privateRoomContainer(roomId)}/${GENERAL_ROOM_KEYS.PUBLIC}`,

  privateRoomState: (roomId: string) =>
    `${DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId)}/${GENERAL_ROOM_KEYS.STATE}`,

  privateRoomGuestName: (roomId: string) =>
    `${DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId)}/${GENERAL_ROOM_KEYS.GUEST}/${GENERAL_ROOM_KEYS.NAME}`,

  guestScore: (roomId: string, isPrivateMatch: boolean = false) =>
    `${isPrivateMatch ? DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId) : DATABASE_PATHS_FOR_ROOMS.randomRoom(roomId)}/${GENERAL_ROOM_KEYS.GUEST}/${GENERAL_ROOM_KEYS.SCORE}`,

  guestMana: (roomId: string, isPrivateMatch: boolean = false) =>
    `${isPrivateMatch ? DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId) : DATABASE_PATHS_FOR_ROOMS.randomRoom(roomId)}/${GENERAL_ROOM_KEYS.GUEST}/${GENERAL_ROOM_KEYS.MANA}`,

  hostScore: (roomId: string, isPrivateMatch: boolean = false) =>
    `${isPrivateMatch ? DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId) : DATABASE_PATHS_FOR_ROOMS.randomRoom(roomId)}/${GENERAL_ROOM_KEYS.HOST}/${GENERAL_ROOM_KEYS.SCORE}`,

  hostMana: (roomId: string, isPrivateMatch: boolean = false) =>
    `${isPrivateMatch ? DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId) : DATABASE_PATHS_FOR_ROOMS.randomRoom(roomId)}/${GENERAL_ROOM_KEYS.HOST}/${GENERAL_ROOM_KEYS.MANA}`,

  privateRoomSpectator: (roomId: string) =>
    `${DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId)}/${PRIVATE_ROOM_KEYS.SPECTATORS}`,

  randomRoom: (roomId: string) =>
    `${ROOT_KEYS.RANDOM_ROOMS}/${roomId}/${GENERAL_ROOM_KEYS.PUBLIC}`,

  game: (roomId: string, isPrivateMatch: boolean = false) =>
    `${isPrivateMatch ? DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId) : DATABASE_PATHS_FOR_ROOMS.randomRoom(roomId)}/${GENERAL_ROOM_KEYS.GAME}`,

  currentRoundNumber: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.game(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.ROUND_NUMBER}`,

  gamePhase: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.game(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.PHASE}`,

  handSubmissionDeadline: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.game(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.HAND_SUBMISSION_DEADLINE}`,

  finalWinnerOfMatch: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.game(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.FINAL_WINNER_OF_MATCH}`,

  cheater: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.game(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.CHEATER}`,

  resigner: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.game(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.RESIGNER}`,

  backToLobbyAt: (roomId: string) =>
    `${DATABASE_PATHS_FOR_ROOMS.game(roomId, true)}/${PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT}`,

  resolvedRound: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.game(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.RESOLVED_ROUND}`,

  resolvedHostHand: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.resolvedRound(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.HOST}/${GENERAL_ROOM_KEYS.SELECTED_HAND}`,

  resolvedGuestHand: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.resolvedRound(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.GUEST}/${GENERAL_ROOM_KEYS.SELECTED_HAND}`,

  nextPhaseAt: (roomId: string, isPrivateMatch: boolean = false) =>
    `${DATABASE_PATHS_FOR_ROOMS.resolvedRound(roomId, isPrivateMatch)}/${GENERAL_ROOM_KEYS.NEXT_PHASE_AT}`,

  guestIsKickedAt: (roomId: string) =>
    `${DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId)}/${PRIVATE_ROOM_KEYS.GUEST_IS_KICKED_AT}`,

  privateRoomJoinCode: (joinCodeHash: string) =>
    `${ROOT_KEYS.PRIVATE_ROOM_JOIN_CODES}/${joinCodeHash}`,

  privateRoomJoinCodeRoomId: (joinCodeHash: string) =>
    `${ROOT_KEYS.PRIVATE_ROOM_JOIN_CODES}/${joinCodeHash}/${PRIVATE_ROOM_JOIN_CODE_KEYS.ROOM_ID}`,

  privateRoomConfidentialRoot: (roomId: string) =>
    `${DATABASE_PATHS_FOR_ROOMS.privateRoomContainer(roomId)}/${GENERAL_ROOM_KEYS.CONFIDENTIAL}`,

  privateRoomConfidential: (roomId: string, roundNumber: number) =>
    `${DATABASE_PATHS_FOR_ROOMS.privateRoomConfidentialRoot(roomId)}/${roundNumber}`,
} as const;
