export type ExpireActiveUserSessionTask = {
  uid: string;
  sessionId: string;
  reconnectDeadline: number;
};
