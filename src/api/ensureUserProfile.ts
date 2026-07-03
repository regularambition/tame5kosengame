import {getCallableFunction} from "../firebase";

import type {EnsureUserProfileResponse} from "@tame5kosengame/shared";

export async function ensureUserProfile() {
  const func = getCallableFunction<void, EnsureUserProfileResponse>("ensureUserProfile");
  return await func();
}
