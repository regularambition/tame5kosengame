import {getCallableFunction} from "../../firebase";

import type {HandId, SubmitHandRequest, SubmitHandResponse} from "@tame5kosengame/shared";

export async function submitHand(
  roomId: string,
  hand: HandId,
  roundNumber: number,
  myMana: number,
) {
  const func = getCallableFunction<SubmitHandRequest, SubmitHandResponse>("submitHand");
  return await func({roomId, hand, roundNumber, myMana});
}
