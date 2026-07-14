import {onValue, ref} from "firebase/database";

import {database} from "../firebase";

import {DATABASE_PATHS_FOR_ROOMS, RoomState} from "@tame5kosengame/shared";

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

export function watchOpponentFinishedIntro(
  roomId: string,
  iAmHost: boolean,
  onFinished: () => void,
) {
  const opponentScoreRef = iAmHost
    ? ref(database, DATABASE_PATHS_FOR_ROOMS.privateRoomGuestScore(roomId))
    : ref(database, DATABASE_PATHS_FOR_ROOMS.privateRoomHostScore(roomId));

  return onValue(opponentScoreRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onFinished();
    }
  });
}
