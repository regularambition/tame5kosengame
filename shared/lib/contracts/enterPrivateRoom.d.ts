export type EnterPrivateRoomRequest = {
    joinCode: string;
    isPlayer: boolean;
};
export type EnterPrivateRoomResponse = {
    roomId: string;
    hostUid: string;
};
