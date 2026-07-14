import {getCallableFunction} from "../../firebase";

import type {
  InitializeAfterIntroRequest,
  InitializeAfterIntroResponse,
} from "@tame5kosengame/shared";

export async function initializeAfterIntro(roomId: string) {
  const func = getCallableFunction<InitializeAfterIntroRequest, InitializeAfterIntroResponse>(
    "initializeAfterIntro",
  );
  return await func({roomId});
}
