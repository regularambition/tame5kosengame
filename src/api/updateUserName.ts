import {getCallableFunction} from "../firebase";

export async function updateUserName(name: string) {
  const func = getCallableFunction<{name: string}, void>("updateUserName");
  return await func({name});
}
