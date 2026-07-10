export type EnterPrivateRoomRequest = {
    joinCode: string;
    isPlayer: boolean;
    userName: string;
};
export type EnterPrivateRoomResponse = {
    roomId: string;
    hostUid: string;
};
