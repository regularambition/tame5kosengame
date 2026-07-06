export const ROOM_STATES = {
  PREPARING: {value: "preparing"} as const,
  PLAYING: {value: "playing"} as const,
  RECONNECT_GRACE: {value: "reconnectGrace"} as const,
  REMATCH_CHOICE: {value: "rematchChoice"} as const,
  CLOSED: {value: "closed"} as const,
} as const;

export type RoomState = (typeof ROOM_STATES)[keyof typeof ROOM_STATES];
