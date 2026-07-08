export type CreatePrivateRoomRequest = {
    matchPoint: string;
    thinkingTime: string;
};
export type CreatePrivateRoomResponse = {
    roomId: string;
    joinCode: string;
};
