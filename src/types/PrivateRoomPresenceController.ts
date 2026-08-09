export type PrivateRoomPresenceController = {
  connectionId: string;
  stop: () => Promise<void>;
};
