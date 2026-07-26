import {getCallableFunction} from "../firebase";

import type {LeavePrivateRoomRequest, LeavePrivateRoomResponse} from "@tame5kosengame/shared";

export async function leavePrivateRoom(isPlayer: boolean, roomId: string) {
  const func = getCallableFunction<LeavePrivateRoomRequest, LeavePrivateRoomResponse>(
    "leavePrivateRoom",
  );
  return await func({isPlayer, roomId});
}
