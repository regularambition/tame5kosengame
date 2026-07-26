import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchSpectatorCount(roomId: string, onChange: (newSpectatorCount: number) => void) {
  const spectatorCountRef = ref(database, DATABASE_PATHS_FOR_ROOMS.privateRoomSpectator(roomId));

  return onValue(spectatorCountRef, (snapshot) => {
    let spectatorCount = 0;

    snapshot.forEach((childSnapshot) => {
      if (childSnapshot.val() === true) {
        spectatorCount++;
      }
    });

    onChange(spectatorCount);
  });
}
