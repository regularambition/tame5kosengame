import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchGuestScore(
  roomId: string,
  onChange: (newGuestScore: number) => void,
  isPrivateMatch: boolean = false,
) {
  const guestScoreRef = ref(database, DATABASE_PATHS_FOR_ROOMS.guestScore(roomId, isPrivateMatch));

  return onValue(guestScoreRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onChange(snapshot.val());
    }
  });
}
