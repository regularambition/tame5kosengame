import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {
  DATABASE_PATHS_FOR_ROOMS,
  isResignerDetectionResult,
  ResignerDetectionResultId,
} from "@tame5kosengame/shared";

export function watchResigner(
  roomId: string,
  onChange: (resigner: ResignerDetectionResultId) => void,
  isPrivateMatch: boolean = false,
) {
  const resignerRef = ref(database, DATABASE_PATHS_FOR_ROOMS.resigner(roomId, isPrivateMatch));

  return onValue(resignerRef, (snapshot) => {
    if (isResignerDetectionResult(snapshot.val())) {
      onChange(snapshot.val());
    }
  });
}
