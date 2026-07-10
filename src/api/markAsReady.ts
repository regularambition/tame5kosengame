import {getCallableFunction} from "../firebase";

import type {MarkAsReadyRequest, MarkAsReadyResponse} from "@tame5kosengame/shared";

export async function markAsReady(roomId: string) {
  const func = getCallableFunction<MarkAsReadyRequest, MarkAsReadyResponse>("markAsReady");
  return await func({roomId});
}
