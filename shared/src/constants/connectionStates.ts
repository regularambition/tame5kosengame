export const CONNECTION_STATES = {
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
} as const;

export type ConnectionState = (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES];
