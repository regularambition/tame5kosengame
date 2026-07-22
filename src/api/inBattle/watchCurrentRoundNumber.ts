import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchCurrentRoundNumber(
  roomId: string,
  onChange: (gamePhase: number) => void,
  isPrivateMatch: boolean = false,
) {
  const gamePhaseRef = ref(
    database,
    DATABASE_PATHS_FOR_ROOMS.currentRoundNumber(roomId, isPrivateMatch),
  );

  return onValue(gamePhaseRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onChange(snapshot.val());
    }
  });
}
