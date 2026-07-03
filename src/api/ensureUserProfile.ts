import {getCallableFunction} from "../firebase";

export interface EnsureUserProfileResponse {
  exists: boolean;
  user: {
    uid: string;
    name: string;
    createdAt: number;
  };
}

export async function ensureUserProfile() {
  const func = getCallableFunction<void, EnsureUserProfileResponse>("ensureUserProfile");
  return await func();
}
