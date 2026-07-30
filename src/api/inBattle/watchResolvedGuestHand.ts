import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS, HandId} from "@tame5kosengame/shared";

export function watchResolvedGuestHand(
  roomId: string,
  onChange: (newGuestHand: HandId) => void,
  isPrivateMatch: boolean = false,
) {
  const guestHandRef = ref(
    database,
    DATABASE_PATHS_FOR_ROOMS.resolvedGuestHand(roomId, isPrivateMatch),
  );

  return onValue(guestHandRef, (snapshot) => {
    if (snapshot.val() != null) {
      onChange(snapshot.val());
    }
  });
}
