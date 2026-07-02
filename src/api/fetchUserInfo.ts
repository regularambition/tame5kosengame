import {getCallableFunction} from "../firebase";

export interface fetchUserInfoResponse {
  exists: boolean;
  user: {
    uid: string;
    name: string;
    createdAt: number;
  };
}

export async function fetchUserInfo() {
  const func = getCallableFunction<void, fetchUserInfoResponse>("fetchUserInfo");
  return await func();
}
