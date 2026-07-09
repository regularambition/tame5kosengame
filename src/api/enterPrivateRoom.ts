import {getCallableFunction} from "../firebase";

import type {EnterPrivateRoomRequest, EnterPrivateRoomResponse} from "@tame5kosengame/shared";

export async function enterPrivateRoom(joinCode: string, isPlayer: boolean) {
  const func = getCallableFunction<EnterPrivateRoomRequest, EnterPrivateRoomResponse>(
    "enterPrivateRoom",
  );
  return await func({joinCode, isPlayer});
}
