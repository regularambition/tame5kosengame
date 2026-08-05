import {ROOT_KEYS} from "./root.js";

export const ACTIVE_USER_SESSION_KEYS = {
  SESSION_ID: "sessionId",
  CLAIMED_AT: "claimedAt",
  CONNECTED_AT: "connectedAt",
} as const;

export const DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS = {
  activeUserSession: (uid: string) => `${ROOT_KEYS.ACTIVE_USER_SESSIONS}/${uid}`,

  activeUserSessionPresenceRoot: (uid: string) =>
    `${ROOT_KEYS.ACTIVE_USER_SESSION_PRESENCE}/${uid}`,

  activeUserSessionPresence: (uid: string, sessionId: string) =>
    `${DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSessionPresenceRoot(uid)}/${sessionId}`,
} as const;
