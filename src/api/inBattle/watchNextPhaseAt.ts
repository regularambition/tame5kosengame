import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchNextPhaseAt(
  roomId: string,
  onChange: (nextPhaseAt: number) => void,
  isPrivateMatch: boolean = false,
) {
  const nextPhaseAtRef = ref(
    database,
    DATABASE_PATHS_FOR_ROOMS.nextPhaseAt(roomId, isPrivateMatch),
  );

  return onValue(nextPhaseAtRef, (snapshot) => {
    if (snapshot.val() !== null) {
      onChange(snapshot.val());
    }
  });
}
