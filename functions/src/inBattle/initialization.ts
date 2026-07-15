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
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  // PRIVATE_ROOM_JOIN_CODE_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
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

    const iAmHost = uid === hostUid;
    let retryCount = 10;
    const result = await roomRef.transaction((room) => {
      if (room === null) {
        if (retryCount > 0) {
          --retryCount;
          return room;
        } else {
          return undefined;
        }
      }

      if (room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING) {
        return undefined;
      }

      const phase = room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.PHASE];
      if (phase !== GAME_PHASES.INTRO) {
        return undefined;
      }

      const currentPlayer = iAmHost ? room[PRIVATE_ROOM_KEYS.HOST] : room[PRIVATE_ROOM_KEYS.GUEST];
      // 同じプレイヤーから再度呼ばれても再初期化しない
      if (currentPlayer[GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] !== true) {
        currentPlayer[GENERAL_ROOM_KEYS.SCORE] = 0;
        currentPlayer[GENERAL_ROOM_KEYS.MANA] = 1;
        currentPlayer[GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] = true;
      }

      const hostInitialized =
        room[PRIVATE_ROOM_KEYS.HOST][GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] === true;
      const guestInitialized =
        room[PRIVATE_ROOM_KEYS.GUEST][GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] === true;
      if (hostInitialized && guestInitialized) {
        room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.SELECTING;
      }

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Initialization failed.");
    }

    return {hasSucceeded: true};
  },
);
