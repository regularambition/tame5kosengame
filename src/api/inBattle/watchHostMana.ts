import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchHostMana(
  roomId: string,
  onChange: (newHostMana: number) => void,
  isPrivateMatch: boolean = false,
) {
  const hostManaRef = ref(database, DATABASE_PATHS_FOR_ROOMS.hostMana(roomId, isPrivateMatch));

  return onValue(hostManaRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onChange(snapshot.val());
    }
  });
}
