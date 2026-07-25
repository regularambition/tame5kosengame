import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchBackToLobbyAt(
  roomId: string,
  onChange: (backToLobbyAt: number) => void,
  isPrivateMatch: boolean = false,
) {
  const backToLobbyAtRef = ref(database, DATABASE_PATHS_FOR_ROOMS.backToLobbyAt(roomId));

  return onValue(backToLobbyAtRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onChange(snapshot.val());
    }
  });
}
