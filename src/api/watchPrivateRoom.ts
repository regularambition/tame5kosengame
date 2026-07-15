import {onValue, ref} from "firebase/database";

import {database} from "../firebase";

import {DATABASE_PATHS_FOR_ROOMS, GAME_PHASES, GamePhase, RoomState} from "@tame5kosengame/shared";

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

export function watchPrivateRoomGamePhase(
  roomId: string,
  onChange: (gamePhase: GamePhase) => void,
) {
  const gamePhaseRef = ref(database, DATABASE_PATHS_FOR_ROOMS.privateRoomGamePhase(roomId));

  return onValue(gamePhaseRef, (snapshot) => {
    if (snapshot.val() !== null) {
      onChange(snapshot.val());
    }
  });
}
