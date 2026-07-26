import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchHostScore(
  roomId: string,
  onChange: (newHostScore: number) => void,
  isPrivateMatch: boolean = false,
) {
  const hostScoreRef = ref(database, DATABASE_PATHS_FOR_ROOMS.hostScore(roomId, isPrivateMatch));

  return onValue(hostScoreRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onChange(snapshot.val());
    }
  });
}
