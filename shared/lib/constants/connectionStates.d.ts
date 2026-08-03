export declare const CONNECTION_STATES: {
    readonly CONNECTED: "connected";
    readonly RECONNECTING: "reconnecting";
};
export type ConnectionState = (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES];
