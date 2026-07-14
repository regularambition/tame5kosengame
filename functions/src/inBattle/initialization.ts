import {onCall, HttpsError} from "firebase-functions/v2/https";

import {db} from "../firebaseAdmin";

import {
  // isValidMatchPoint,
  // isValidThinkingTime,
  // JOIN_CODE_RULES,
  // isValidJoinCode,
  // isValidPushId,
  // ROOM_STATES,
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  // PRIVATE_ROOM_JOIN_CODE_KEYS,
  PRIVATE_ROOM_KEYS,
} from "@tame5kosengame/shared";
import type {
  InitializeAfterIntroRequest,
  InitializeAfterIntroResponse,
} from "@tame5kosengame/shared";

export const initializeAfterIntro = onCall<InitializeAfterIntroRequest>(
  async (request): Promise<InitializeAfterIntroResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const {roomId} = request.data;
    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const uid = request.auth.uid;
    const hostUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    const guestUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.GUEST).child(GENERAL_ROOM_KEYS.UID).val();
    if (uid !== hostUid && uid !== guestUid) {
      throw new HttpsError("failed-precondition", "Invalid user.");
    }

    const targetRef =
      uid === hostUid
        ? roomRef.child(PRIVATE_ROOM_KEYS.HOST)
        : roomRef.child(PRIVATE_ROOM_KEYS.GUEST);

    await targetRef.update({
      [GENERAL_ROOM_KEYS.SCORE]: 0,
      [GENERAL_ROOM_KEYS.MANA]: 1,
    });

    return {hasSucceeded: true};
  },
);
