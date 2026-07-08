export type EnterPrivateRoomRequest = {
  joinCode: string;
};

export type EnterPrivateRoomResponse = {
  roomId: string;
  hostUid: string;
};
