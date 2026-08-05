import { ROOT_KEYS } from "./root.js";
export const ACTIVE_USER_SESSION_KEYS = {
    SESSION_ID: "sessionId",
    CLAIMED_AT: "claimedAt",
    CONNECTED_AT: "connectedAt",
};
export const DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS = {
    activeUserSession: (uid) => `${ROOT_KEYS.ACTIVE_USER_SESSIONS}/${uid}`,
    activeUserSessionPresenceRoot: (uid) => `${ROOT_KEYS.ACTIVE_USER_SESSION_PRESENCE}/${uid}`,
    activeUserSessionPresence: (uid, sessionId) => `${DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSessionPresenceRoot(uid)}/${sessionId}`,
};
