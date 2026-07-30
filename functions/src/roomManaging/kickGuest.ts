import {onCall, HttpsError} from "firebase-functions/v2/https";
import {db} from "../firebaseAdmin";

import {
  isValidPushId,
  ROOM_STATES,
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
} from "@tame5kosengame/shared";
import type {KickGuestRequest, KickGuestResponse} from "@tame5kosengame/shared";

export const kickGuest = onCall<KickGuestRequest>(async (request): Promise<KickGuestResponse> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const {roomId} = request.data;
  if (!isValidPushId(roomId)) {
    throw new HttpsError("invalid-argument", "Invalid room ID.");
  }

  const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
  const roomSnapshot = await roomRef.get();
  if (!roomSnapshot.exists()) {
    throw new HttpsError("not-found", "Private room not found.");
  }

  const result = await roomRef.transaction((currentRoom) => {
    if (currentRoom == null) {
      return currentRoom;
    }

    const state = currentRoom[GENERAL_ROOM_KEYS.STATE];
    if (state !== ROOM_STATES.PREPARING) {
      return currentRoom;
    }

    const host = currentRoom[GENERAL_ROOM_KEYS.HOST];
    const guest = currentRoom[GENERAL_ROOM_KEYS.GUEST];
    if (host == null || guest == null) {
      return currentRoom;
    }

    if (uid !== host[GENERAL_ROOM_KEYS.UID]) {
      return currentRoom;
    }

    currentRoom[PRIVATE_ROOM_KEYS.IS_GUEST_KICKED] = true;

    return currentRoom;
  });
  if (!result.committed) {
    throw new HttpsError("failed-precondition", "Commit of kickGuest failed.");
  }
  if (!result.snapshot.exists()) {
    throw new HttpsError("not-found", "Private room not found after transaction.");
  }

  const finalRoom = result.snapshot.val();
  const finalState = finalRoom[GENERAL_ROOM_KEYS.STATE];
  if (finalState !== ROOM_STATES.PREPARING) {
    throw new HttpsError("failed-precondition", "Room is not in preparing state.");
  }
  const finalHost = finalRoom[GENERAL_ROOM_KEYS.HOST];
  if (finalHost == null) {
    throw new HttpsError("failed-precondition", "Room is broken(lacking host).");
  }
  if (uid !== finalHost[GENERAL_ROOM_KEYS.UID]) {
    throw new HttpsError("permission-denied", "Nobody but host can kick the guest.");
  }

  const finalGuest = finalRoom[GENERAL_ROOM_KEYS.GUEST];
  if (finalGuest == null) {
    throw new HttpsError("failed-precondition", "Room is broken(lacking guest).");
  }

  const finalIsGuestKicked = finalRoom[PRIVATE_ROOM_KEYS.IS_GUEST_KICKED];
  if (finalIsGuestKicked !== true) {
    throw new HttpsError("internal", "Marking for kicking failed.");
  }

  return {
    hasSucceeded: true,
  };
});
