import {getCallableFunction} from "../../firebase";

import type {ResignRequest, ResignResponse} from "@tame5kosengame/shared";

export async function resign(roomId: string, isPrivateMatch: boolean) {
  const func = getCallableFunction<ResignRequest, ResignResponse>("resign");
  return await func({roomId, isPrivateMatch});
}
