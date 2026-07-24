import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchGuestMana(
  roomId: string,
  onChange: (newGuestMana: number) => void,
  isPrivateMatch: boolean = false,
) {
  const guestManaRef = ref(database, DATABASE_PATHS_FOR_ROOMS.guestMana(roomId, isPrivateMatch));

  return onValue(guestManaRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onChange(snapshot.val());
    }
  });
}
