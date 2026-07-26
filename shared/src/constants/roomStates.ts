export const ROOM_STATES = {
  PREPARING: "preparing",
  PLAYING: "playing",
  RECONNECT_GRACE: "reconnectGrace",
  REMATCH_CHOICE: "rematchChoice",
  CLOSED: "closed",
} as const;

export type RoomState = (typeof ROOM_STATES)[keyof typeof ROOM_STATES];
