import {onValue, ref} from "firebase/database";

import {database} from "../firebase";

import {DATABASE_PATHS_FOR_ROOMS, ROOM_STATES} from "@tame5kosengame/shared";

export function watchPrivateRoomDeleted(roomId: string, onDeleted: () => void) {
  const stateRef = ref(database, DATABASE_PATHS_FOR_ROOMS.privateRoomState(roomId));

  return onValue(stateRef, (snapshot) => {
    if (snapshot.val() === ROOM_STATES.CLOSED) {
      onDeleted();
    }
  });
}

export function watchGuestName(roomId: string, onChange: (s: string) => void) {
  const guestNameRef = ref(database, DATABASE_PATHS_FOR_ROOMS.privateRoomGuestName(roomId));

  return onValue(guestNameRef, (snapshot) => {
    onChange(snapshot.val());
  });
}
