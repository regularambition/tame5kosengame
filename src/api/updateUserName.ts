import {getCallableFunction} from "../firebase";
import type {UpdateUserNameRequest} from "@tame5kosengame/shared";

export async function updateUserName(name: string) {
  const func = getCallableFunction<UpdateUserNameRequest, void>("updateUserName");
  return await func({name});
}
