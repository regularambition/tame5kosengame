import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS, GamePhase} from "@tame5kosengame/shared";

export function watchGamePhase(
  roomId: string,
  onChange: (gamePhase: GamePhase) => void,
  isPrivateMatch: boolean = false,
) {
  const gamePhaseRef = ref(database, DATABASE_PATHS_FOR_ROOMS.gamePhase(roomId, isPrivateMatch));

  return onValue(gamePhaseRef, (snapshot) => {
    if (snapshot.val() !== null) {
      onChange(snapshot.val());
    }
  });
}
