import {onCall, HttpsError} from "firebase-functions/v2/https";

import {db} from "../firebaseAdmin";

import {
  // isValidMatchPoint,
  // isValidThinkingTime,
  isValidPushId,
  // ROOM_STATES,
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
  INITIAL_VALUES_IN_BATTLE,
} from "@tame5kosengame/shared";
import type {
  InitializeAfterIntroRequest,
  InitializeAfterIntroResponse,
} from "@tame5kosengame/shared";
import {findHandSubmissionDeadline} from "./timestampGenerator";

export const initializeAfterIntro = onCall<InitializeAfterIntroRequest>(
  async (request): Promise<InitializeAfterIntroResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const {roomId} = request.data;
    if (!isValidPushId(roomId)) {
      throw new HttpsError("invalid-argument", "Invalid room ID.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const uid = request.auth.uid;
    const hostUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    const guestUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.GUEST).child(GENERAL_ROOM_KEYS.UID).val();
    if (typeof hostUid !== "string" || typeof guestUid !== "string") {
      throw new HttpsError("internal", "Incomplete database.");
    }
    if (uid !== hostUid && uid !== guestUid) {
      throw new HttpsError("failed-precondition", "Invalid user.");
    }

    const iAmHost = uid === hostUid;
    const result = await roomRef.transaction((room) => {
      if (room === null) {
        // 初回はローカルキャッシュが古く実際は存在しているはずのデータを
        // 存在しないものと判定してnull扱いするのを抑止するため
        // nullを返して実際のデータベースと照合させるように固定
        // 実際が非nullである場合はtransaction処理を再試行し
        // 本当にnullである場合はtransaction処理が正常終了して下へ進む
        return null;
      }

      if (room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING) {
        // ローカルキャッシュの情報が古い場合はその古い情報をもとに
        // DBを更新しようとするが、transaction処理があるため
        // 「お前が見てるのは古い情報だから最新の値をもとにやり直せ」
        // という応答がDBから来てcallbackを再試行する
        // 実際のDBと一致している場合は正常にtransactionの下へ進む
        return room;
      }

      const phase = room[GENERAL_ROOM_KEYS.GAME]?.[GENERAL_ROOM_KEYS.PHASE];
      if (phase !== GAME_PHASES.INTRO) {
        return room;
      }

      const currentPlayer = iAmHost ? room[PRIVATE_ROOM_KEYS.HOST] : room[PRIVATE_ROOM_KEYS.GUEST];
      // 同じプレイヤーから再度呼ばれても再初期化しない
      if (currentPlayer[GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] !== true) {
        currentPlayer[GENERAL_ROOM_KEYS.SCORE] = INITIAL_VALUES_IN_BATTLE.SCORE;
        currentPlayer[GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;
        currentPlayer[GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] = true;
      }

      const hostInitialized =
        room[PRIVATE_ROOM_KEYS.HOST]?.[GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] === true;
      const guestInitialized =
        room[PRIVATE_ROOM_KEYS.GUEST]?.[GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] === true;
      if (hostInitialized && guestInitialized) {
        room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.SELECTING;

        const thinkingTimeInSec =
          room[GENERAL_ROOM_KEYS.RULES]?.[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC];
        if (typeof thinkingTimeInSec !== "number") {
          return room;
        }
        room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.HAND_SUBMISSION_DEADLINE] =
          findHandSubmissionDeadline(thinkingTimeInSec);
        room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.ROUND_NUMBER] =
          INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER;
      }

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Initialization failed.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("failed-precondition", "Private room not found.");
    }

    const finalRoom = result.snapshot.val();
    const finalState = finalRoom[GENERAL_ROOM_KEYS.STATE];
    const finalGame = finalRoom[GENERAL_ROOM_KEYS.GAME];
    const finalHost = finalRoom[PRIVATE_ROOM_KEYS.HOST];
    const finalGuest = finalRoom[PRIVATE_ROOM_KEYS.GUEST];
    if (!finalHost || !finalGuest || !finalGame) {
      throw new HttpsError("failed-precondition", "Private room data is incomplete.");
    }
    if (finalState !== ROOM_STATES.PLAYING) {
      throw new HttpsError("failed-precondition", "Private room is not playing.");
    }

    const finalPlayer =
      finalHost[GENERAL_ROOM_KEYS.UID] === uid
        ? finalHost
        : finalGuest[GENERAL_ROOM_KEYS.UID] === uid
          ? finalGuest
          : null;
    if (finalPlayer === null) {
      throw new HttpsError("permission-denied", "User is not a player.");
    }
    if (finalPlayer[GENERAL_ROOM_KEYS.HAS_FINISHED_INTRO] !== true) {
      throw new HttpsError("failed-precondition", "Player initialization failed.");
    }

    return {hasSucceeded: true};
  },
);
