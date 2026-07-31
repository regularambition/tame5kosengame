import {getCallableFunction} from "../firebase";

import type {KickGuestRequest, KickGuestResponse} from "@tame5kosengame/shared";

export async function kickGuest(roomId: string) {
  const func = getCallableFunction<KickGuestRequest, KickGuestResponse>("kickGuest");
  return await func({roomId});
}
