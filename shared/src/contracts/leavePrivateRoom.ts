export type LeavePrivateRoomRequest = {
  roomId: string;
  isPlayer: boolean;
};

export type LeavePrivateRoomResponse = {
  hasSucceeded: boolean;
};
