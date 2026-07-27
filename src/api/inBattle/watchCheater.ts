import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {CheaterDetectionResultId, DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchCheater(
  roomId: string,
  onChange: (cheater: CheaterDetectionResultId) => void,
  isPrivateMatch: boolean = false,
) {
  const cheaterRef = ref(database, DATABASE_PATHS_FOR_ROOMS.cheater(roomId, isPrivateMatch));

  return onValue(cheaterRef, (snapshot) => {
    if (snapshot.val() !== null) {
      onChange(snapshot.val());
    }
  });
}
