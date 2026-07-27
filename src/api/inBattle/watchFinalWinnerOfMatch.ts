import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS, WinnerDetectionResultId} from "@tame5kosengame/shared";

export function watchFinalWinnerOfMatch(
  roomId: string,
  onChange: (finalWinnerOfMatch: WinnerDetectionResultId) => void,
  isPrivateMatch: boolean = false,
) {
  const finalWinnerOfMatchRef = ref(
    database,
    DATABASE_PATHS_FOR_ROOMS.finalWinnerOfMatch(roomId, isPrivateMatch),
  );

  return onValue(finalWinnerOfMatchRef, (snapshot) => {
    if (snapshot.val() !== null) {
      onChange(snapshot.val());
    }
  });
}
