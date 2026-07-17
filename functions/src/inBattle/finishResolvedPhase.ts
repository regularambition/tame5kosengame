import {HttpsError} from "firebase-functions/https";
import {onTaskDispatched} from "firebase-functions/v2/tasks";
import {db} from "../firebaseAdmin";
import {
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
} from "@tame5kosengame/shared";
import {FinishResolvedPhaseTask} from "../contracts";
import {findHandSubmissionDeadline} from "./timestampGenerator";
import {PHASE_TRANSITION_TASK_OPTIONS} from "../config";

export const finishResolvedPhase = onTaskDispatched<FinishResolvedPhaseTask>(
  PHASE_TRANSITION_TASK_OPTIONS,
  async (request) => {
    const {roomId, nextPhaseAt, hostUid, guestUid} = request.data;
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
      const rules = room[GENERAL_ROOM_KEYS.RULES];
      const resolvedRound = game?.[GENERAL_ROOM_KEYS.RESOLVED_ROUND];
      if (!game || !rules || !resolvedRound) {
        return room;
      }

      // 再試行時は成功扱いにしてCloud Tasksの再試行を止める
      if (
        game[GENERAL_ROOM_KEYS.PHASE] === GAME_PHASES.SELECTING ||
        game[GENERAL_ROOM_KEYS.PHASE] === GAME_PHASES.FINISHED
      ) {
        return room;
      }

      // すでに別フェーズなら古いタスクなので何もしない
      if (game[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.RESOLVED) {
        return room;
      }

      const storedNextPhaseAt =
        game[GENERAL_ROOM_KEYS.RESOLVED_ROUND]?.[GENERAL_ROOM_KEYS.NEXT_PHASE_AT];
      const storedHostUid = room[PRIVATE_ROOM_KEYS.HOST]?.[GENERAL_ROOM_KEYS.UID];
      const storedGuestUid = room[PRIVATE_ROOM_KEYS.GUEST]?.[GENERAL_ROOM_KEYS.UID];
      // 同じresolvedに対するタスクであることを確認
      if (
        storedNextPhaseAt !== nextPhaseAt ||
        storedHostUid !== hostUid ||
        storedGuestUid !== guestUid
      ) {
        return room;
      }

      // 念のため、予定時刻より早ければ失敗させて再試行させる
      if (Date.now() < nextPhaseAt) {
        throw new HttpsError("failed-precondition", "Resolved phase has not reached its deadline.");
      }

      const thinkingTimeInSec = rules[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC];
      const matchPoint = rules[GENERAL_ROOM_KEYS.MATCH_POINT];
      const hostScore = resolvedRound?.[hostUid]?.[GENERAL_ROOM_KEYS.SCORE];
      const guestScore = resolvedRound?.[guestUid]?.[GENERAL_ROOM_KEYS.SCORE];
      const roundNumber = game[GENERAL_ROOM_KEYS.ROUND_NUMBER];
      if (
        typeof thinkingTimeInSec !== "number" ||
        typeof matchPoint !== "number" ||
        typeof hostScore !== "number" ||
        typeof guestScore !== "number" ||
        typeof roundNumber !== "number"
      ) {
        return room;
      }

      if (Math.max(hostScore, guestScore) < matchPoint) {
        game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.SELECTING;
        game[GENERAL_ROOM_KEYS.ROUND_NUMBER] += 1;
        game[GENERAL_ROOM_KEYS.HAND_SUBMISSION_DEADLINE] =
          findHandSubmissionDeadline(thinkingTimeInSec);
      } else {
        game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.FINISHED;
        game[GENERAL_ROOM_KEYS.FINAL_WINNER_UID] = hostScore >= matchPoint ? hostUid : guestUid;
      }

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Cannot commit.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found after transaction.");
    }

    const finalRoom = result.snapshot.val();
    const finalGamePhase = finalRoom[GENERAL_ROOM_KEYS.GAME]?.[GENERAL_ROOM_KEYS.PHASE];
    if (finalGamePhase !== GAME_PHASES.SELECTING && finalGamePhase !== GAME_PHASES.FINISHED) {
      throw new HttpsError("internal", "Cannot go to selecting or finished from resolved.");
    }
  },
);
