export declare const ACTIVE_USER_SESSION_KEYS: {
    readonly SESSION_ID: "sessionId";
    readonly CLAIMED_AT: "claimedAt";
    readonly CONNECTED_AT: "connectedAt";
    readonly RECONNECT_DEADLINE: "reconnectDeadline";
};
export declare const DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS: {
    readonly activeUserSession: (uid: string) => string;
    readonly activeUserSessionPresenceRoot: (uid: string) => string;
    readonly activeUserSessionPresence: (uid: string, sessionId: string) => string;
};
