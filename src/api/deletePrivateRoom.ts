import {getCallableFunction} from "../firebase";

import type {DeletePrivateRoomRequest, DeletePrivateRoomResponse} from "@tame5kosengame/shared";

export async function deletePrivateRoom(roomId: string) {
  const func = getCallableFunction<DeletePrivateRoomRequest, DeletePrivateRoomResponse>(
    "deletePrivateRoom",
  );
  return await func({roomId});
}
