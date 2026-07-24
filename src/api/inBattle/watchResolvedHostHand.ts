import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS, HandId} from "@tame5kosengame/shared";

export function watchResolvedHostHand(
  roomId: string,
  onChange: (newHostHand: HandId) => void,
  isPrivateMatch: boolean = false,
) {
  const hostHandRef = ref(
    database,
    DATABASE_PATHS_FOR_ROOMS.resolvedHostHand(roomId, isPrivateMatch),
  );

  return onValue(hostHandRef, (snapshot) => {
    if (snapshot.val() !== null) {
      onChange(snapshot.val());
    }
  });
}
