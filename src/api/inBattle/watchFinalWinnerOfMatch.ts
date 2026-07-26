import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS, WinnerDetectionResultId} from "@tame5kosengame/shared";

export function watchFinalWinnerOfMatch(
  roomId: string,
  onChange: (finalWinnerOfMatch: WinnerDetectionResultId) => void,
  isPrivateMatch: boolean = false,
) {
  const nextPhaseAtRef = ref(
    database,
    DATABASE_PATHS_FOR_ROOMS.finalWinnerOfMatch(roomId, isPrivateMatch),
  );

  return onValue(nextPhaseAtRef, (snapshot) => {
    if (snapshot.val() !== null) {
      onChange(snapshot.val());
    }
  });
}
