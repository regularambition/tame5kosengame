import {getCallableFunction} from "../firebase";

import type {CreatePrivateRoomRequest, CreatePrivateRoomResponse} from "@tame5kosengame/shared";

export async function createPrivateRoom(
  matchPoint: string,
  thinkingTime: string,
  userName: string,
) {
  const func = getCallableFunction<CreatePrivateRoomRequest, CreatePrivateRoomResponse>(
    "createPrivateRoom",
  );
  return await func({matchPoint, thinkingTime, userName});
}
