import {onValue, ref} from "firebase/database";

import {database} from "../firebase";

import {DATABASE_PATHS, GENERAL_ROOM_KEYS, ROOM_STATES} from "@tame5kosengame/shared";

export function watchPrivateRoomDeleted(roomId: string, onDeleted: () => void) {
  const roomRef = ref(database, DATABASE_PATHS.privateRoom(roomId));

  return onValue(roomRef, (snapshot) => {
    // if (!snapshot.exists()) {
    //   onDeleted();
    // }

    if (snapshot.child(GENERAL_ROOM_KEYS.STATE).val() === ROOM_STATES.CLOSED) {
      onDeleted();
    }
  });
}
