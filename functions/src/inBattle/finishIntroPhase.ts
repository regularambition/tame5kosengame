import {HttpsError} from "firebase-functions/https";
import {onTaskDispatched} from "firebase-functions/v2/tasks";
import {db} from "../firebaseAdmin";
import {
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
} from "@tame5kosengame/shared";
import {FinishIntroPhaseTask} from "../contracts";
import {findHandSubmissionDeadline} from "./timestampGenerator";
import {PHASE_TRANSITION_TASK_OPTIONS} from "../config";

export const finishIntroPhase = onTaskDispatched<FinishIntroPhaseTask>(
  PHASE_TRANSITION_TASK_OPTIONS,
  async (request) => {
    const {roomId, nextPhaseAt} = request.data;
    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const result = await roomRef.transaction((room) => {
      if (room === null) {
        return room;
      }

      const game = room[GENERAL_ROOM_KEYS.GAME];
      const host = room[GENERAL_ROOM_KEYS.HOST];
      const guest = room[GENERAL_ROOM_KEYS.GUEST];

      if (game === null || host === null || guest === null) {
        return room;
      }

      // 再試行時は成功扱いにしてCloud Tasksの再試行を止める
      if (game[GENERAL_ROOM_KEYS.PHASE] === GAME_PHASES.SELECTING) {
        return room;
      }

      // すでに別フェーズなら古いタスクなので何もしない
      if (game[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.INTRO) {
        return room;
      }

      const storedNextPhaseAt =
        game[GENERAL_ROOM_KEYS.RESOLVED_ROUND]?.[GENERAL_ROOM_KEYS.NEXT_PHASE_AT];

      // 同じintroに対するタスクであることを確認
      if (storedNextPhaseAt !== nextPhaseAt) {
        return room;
      }

      // 念のため、予定時刻より早ければ失敗させて再試行させる
      if (Date.now() < nextPhaseAt) {
        throw new HttpsError("failed-precondition", "Intro phase has not reached its deadline.");
      }

      if (
        typeof host[PRIVATE_ROOM_KEYS.READY] !== "boolean" ||
        typeof guest[PRIVATE_ROOM_KEYS.READY] !== "boolean"
      ) {
        return room;
      }

      const thinkingTimeInSec =
        room[GENERAL_ROOM_KEYS.RULES]?.[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC];
      if (typeof thinkingTimeInSec !== "number") {
        return room;
      }

      host[PRIVATE_ROOM_KEYS.READY] = false;
      guest[PRIVATE_ROOM_KEYS.READY] = false;

      game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.SELECTING;
      game[GENERAL_ROOM_KEYS.HAND_SUBMISSION_DEADLINE] =
        findHandSubmissionDeadline(thinkingTimeInSec);

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Cannot commit.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found after transaction.");
    }

    const finalRoom = result.snapshot.val();

    const finalGame = finalRoom[GENERAL_ROOM_KEYS.GAME];
    const finalHost = finalRoom[GENERAL_ROOM_KEYS.HOST];
    const finalGuest = finalRoom[GENERAL_ROOM_KEYS.GUEST];
    if (finalGame === null || finalHost === null || finalGuest === null) {
      throw new HttpsError("internal", "game host guest missing.");
    }
    if (
      finalHost[PRIVATE_ROOM_KEYS.READY] !== false ||
      finalGuest[PRIVATE_ROOM_KEYS.READY] !== false
    ) {
      throw new HttpsError("internal", "ready is not set as false.");
    }

    const finalThinkingTimeInSec =
      finalRoom[GENERAL_ROOM_KEYS.RULES]?.[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC];
    if (typeof finalThinkingTimeInSec !== "number") {
      throw new HttpsError("internal", "thinking time is missing.");
    }

    const finalGamePhase = finalGame[GENERAL_ROOM_KEYS.PHASE];
    if (finalGamePhase !== GAME_PHASES.SELECTING) {
      throw new HttpsError("internal", "Cannot go to selecting from intro.");
    }
  },
);
