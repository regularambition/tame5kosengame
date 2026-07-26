export type CreatePrivateRoomRequest = {
  matchPoint: string;
  thinkingTime: string;
  userName: string;
};

export type CreatePrivateRoomResponse = {
  roomId: string;
  joinCode: string;
};
