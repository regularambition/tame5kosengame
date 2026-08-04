import {onValue, ref} from "firebase/database";

import {database} from "../firebase";

import {ConnectionState, DATABASE_PATHS_FOR_ROOMS, RoomState} from "@tame5kosengame/shared";

export function watchPrivateRoomState(roomId: string, onChange: (st: RoomState) => void) {
  const stateRef = ref(database, DATABASE_PATHS_FOR_ROOMS.privateRoomState(roomId));

  return onValue(stateRef, (snapshot) => {
    onChange(snapshot.val());
  });
}

export function watchGuestName(roomId: string, onChange: (s: string) => void) {
  const guestNameRef = ref(database, DATABASE_PATHS_FOR_ROOMS.privateRoomGuestName(roomId));

  return onValue(guestNameRef, (snapshot) => {
    onChange(snapshot.val());
  });
}

export function watchGuestIsKickedAt(roomId: string, onChange: (ts: number | null) => void) {
  const guestIsKickedAtRef = ref(database, DATABASE_PATHS_FOR_ROOMS.guestIsKickedAt(roomId));

  return onValue(guestIsKickedAtRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onChange(snapshot.val());
    } else {
      onChange(null);
    }
  });
}

export function watchConnectionState(
  roomId: string,
  onChange: (state: ConnectionState | null) => void,
  targetIsHost: boolean = true,
) {
  const connectionStateRef = ref(
    database,
    targetIsHost
      ? DATABASE_PATHS_FOR_ROOMS.privateRoomHostConnectionState(roomId)
      : DATABASE_PATHS_FOR_ROOMS.privateRoomGuestConnectionState(roomId),
  );

  return onValue(connectionStateRef, (snapshot) => {
    onChange(snapshot.val());
  });
}
