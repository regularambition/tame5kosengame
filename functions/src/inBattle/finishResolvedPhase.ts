import {HttpsError} from "firebase-functions/https";
import {onTaskDispatched} from "firebase-functions/v2/tasks";
import {db} from "../firebaseAdmin";
import {
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  INITIAL_VALUES_IN_BATTLE,
  isCheaterDetectionResult,
  isResignerDetectionResult,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
  WINNER_DETECTION_RESULT,
} from "@tame5kosengame/shared";
import {FinishResolvedPhaseTask} from "../contracts";
import {findBackToLobbyAt, findHandSubmissionDeadline} from "../forCloudTasks";
import {PHASE_TRANSITION_TASK_OPTIONS} from "../config";

export const finishResolvedPhase = onTaskDispatched<FinishResolvedPhaseTask>(
  PHASE_TRANSITION_TASK_OPTIONS,
  async (request) => {
    const {roomId, nextPhaseAt, roundNumber} = request.data;
    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const result = await roomRef.transaction((room) => {
      if (!room || room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING) {
        return room;
      }

      const host = room[GENERAL_ROOM_KEYS.HOST];
      const guest = room[GENERAL_ROOM_KEYS.GUEST];
      const game = room[GENERAL_ROOM_KEYS.GAME];
      const rules = room[GENERAL_ROOM_KEYS.RULES];
      const resolvedRound = game?.[GENERAL_ROOM_KEYS.RESOLVED_ROUND];

      if (!host || !guest || !game || !rules || !resolvedRound) {
        return room;
      }

      // すでに古いタスク（チート対策処理や降参が割り込んでいる場合も含む）なら何もしない
      if (
        game[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.RESOLVED ||
        resolvedRound[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber ||
        isCheaterDetectionResult(game[GENERAL_ROOM_KEYS.CHEATER]) ||
        isResignerDetectionResult(game[GENERAL_ROOM_KEYS.RESIGNER])
      ) {
        return room;
      }

      const storedNextPhaseAt =
        game[GENERAL_ROOM_KEYS.RESOLVED_ROUND]?.[GENERAL_ROOM_KEYS.NEXT_PHASE_AT];

      // 同じresolvedに対するタスクであることを確認
      if (storedNextPhaseAt !== nextPhaseAt) {
        return room;
      }

      // 念のため、予定時刻より早ければ失敗させて再試行させる
      if (Date.now() < nextPhaseAt) {
        throw new HttpsError("failed-precondition", "Resolved phase has not reached its deadline.");
      }

      const hostMana = host[GENERAL_ROOM_KEYS.MANA];
      const hostScore = host[GENERAL_ROOM_KEYS.SCORE];
      const guestMana = guest[GENERAL_ROOM_KEYS.MANA];
      const guestScore = guest[GENERAL_ROOM_KEYS.SCORE];
      const thinkingTimeInSec = rules[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC];
      const matchPoint = rules[GENERAL_ROOM_KEYS.MATCH_POINT];
      const hostManaGain = resolvedRound?.[GENERAL_ROOM_KEYS.HOST]?.[GENERAL_ROOM_KEYS.MANA_GAIN];
      const guestManaGain = resolvedRound?.[GENERAL_ROOM_KEYS.GUEST]?.[GENERAL_ROOM_KEYS.MANA_GAIN];
      const hostScoreGain = resolvedRound?.[GENERAL_ROOM_KEYS.HOST]?.[GENERAL_ROOM_KEYS.SCORE_GAIN];
      const guestScoreGain =
        resolvedRound?.[GENERAL_ROOM_KEYS.GUEST]?.[GENERAL_ROOM_KEYS.SCORE_GAIN];
      const winnerOfRound = resolvedRound?.[GENERAL_ROOM_KEYS.WINNER_OF_ROUND];

      if (
        typeof hostMana !== "number" ||
        typeof hostScore !== "number" ||
        typeof guestMana !== "number" ||
        typeof guestScore !== "number" ||
        typeof thinkingTimeInSec !== "number" ||
        typeof matchPoint !== "number" ||
        typeof hostManaGain !== "number" ||
        typeof guestManaGain !== "number" ||
        typeof hostScoreGain !== "number" ||
        typeof guestScoreGain !== "number" ||
        typeof winnerOfRound !== "string" ||
        typeof game[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== "number"
      ) {
        return room;
      }

      if (winnerOfRound === WINNER_DETECTION_RESULT.DRAW) {
        const newHostMana = hostMana + hostManaGain;
        const newGuestMana = guestMana + guestManaGain;
        host[GENERAL_ROOM_KEYS.MANA] = newHostMana;
        guest[GENERAL_ROOM_KEYS.MANA] = newGuestMana;
      } else {
        host[GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;
        guest[GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;
      }

      const newHostScore = hostScore + hostScoreGain;
      const newGuestScore = guestScore + guestScoreGain;
      host[GENERAL_ROOM_KEYS.SCORE] = newHostScore;
      guest[GENERAL_ROOM_KEYS.SCORE] = newGuestScore;

      if (Math.max(newHostScore, newGuestScore) < matchPoint) {
        game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.SELECTING;
        game[GENERAL_ROOM_KEYS.ROUND_NUMBER] = roundNumber + 1;
        game[GENERAL_ROOM_KEYS.HAND_SUBMISSION_DEADLINE] =
          findHandSubmissionDeadline(thinkingTimeInSec);
      } else {
        game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.FINISHED;
        game[GENERAL_ROOM_KEYS.FINAL_WINNER_OF_MATCH] =
          newHostScore >= matchPoint
            ? WINNER_DETECTION_RESULT.HOST_WON
            : WINNER_DETECTION_RESULT.GUEST_WON;
        game[PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT] = findBackToLobbyAt();
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
    const finalHost = finalRoom[GENERAL_ROOM_KEYS.HOST];
    const finalGuest = finalRoom[GENERAL_ROOM_KEYS.GUEST];
    const finalGame = finalRoom[GENERAL_ROOM_KEYS.GAME];
    const finalRules = finalRoom[GENERAL_ROOM_KEYS.RULES];
    const finalResolvedRound = finalGame?.[GENERAL_ROOM_KEYS.RESOLVED_ROUND];

    if (!finalHost || !finalGuest || !finalGame || !finalRules || !finalResolvedRound) {
      throw new HttpsError("failed-precondition", "Database is incomplete. (after transaction)");
    }

    const finalState = finalRoom[GENERAL_ROOM_KEYS.STATE];
    const finalRoundNumber = finalResolvedRound[GENERAL_ROOM_KEYS.ROUND_NUMBER];
    const finalNextPhaseAt = finalResolvedRound[GENERAL_ROOM_KEYS.NEXT_PHASE_AT];
    if (
      finalState !== ROOM_STATES.PLAYING ||
      finalRoundNumber !== roundNumber ||
      finalNextPhaseAt !== nextPhaseAt
    ) {
      // すでに古いタスクなら何もしない
      return;
    }

    if (
      isCheaterDetectionResult(finalGame[GENERAL_ROOM_KEYS.CHEATER]) ||
      isResignerDetectionResult(finalGame[GENERAL_ROOM_KEYS.RESIGNER])
    ) {
      // チート対策処理や降参が先に割り込んできている場合はすぐさま終了
      return;
    }

    const finalHostMana = finalHost[GENERAL_ROOM_KEYS.MANA];
    const finalHostScore = finalHost[GENERAL_ROOM_KEYS.SCORE];
    const finalGuestMana = finalGuest[GENERAL_ROOM_KEYS.MANA];
    const finalGuestScore = finalGuest[GENERAL_ROOM_KEYS.SCORE];
    const finalThinkingTimeInSec = finalRules[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC];
    const finalMatchPoint = finalRules[GENERAL_ROOM_KEYS.MATCH_POINT];
    const finalHostManaGain =
      finalResolvedRound?.[GENERAL_ROOM_KEYS.HOST]?.[GENERAL_ROOM_KEYS.MANA_GAIN];
    const finalGuestManaGain =
      finalResolvedRound?.[GENERAL_ROOM_KEYS.GUEST]?.[GENERAL_ROOM_KEYS.MANA_GAIN];
    const finalHostScoreGain =
      finalResolvedRound?.[GENERAL_ROOM_KEYS.HOST]?.[GENERAL_ROOM_KEYS.SCORE_GAIN];
    const finalGuestScoreGain =
      finalResolvedRound?.[GENERAL_ROOM_KEYS.GUEST]?.[GENERAL_ROOM_KEYS.SCORE_GAIN];
    const finalWinnerOfRound = finalResolvedRound?.[GENERAL_ROOM_KEYS.WINNER_OF_ROUND];

    if (
      typeof finalHostMana !== "number" ||
      typeof finalHostScore !== "number" ||
      typeof finalGuestMana !== "number" ||
      typeof finalGuestScore !== "number" ||
      typeof finalThinkingTimeInSec !== "number" ||
      typeof finalMatchPoint !== "number" ||
      typeof finalHostManaGain !== "number" ||
      typeof finalGuestManaGain !== "number" ||
      typeof finalHostScoreGain !== "number" ||
      typeof finalGuestScoreGain !== "number" ||
      typeof finalWinnerOfRound !== "string" ||
      typeof finalGame[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== "number"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Database has only incomplete detail. (after transaction)",
      );
    }

    const finalGamePhase = finalGame[GENERAL_ROOM_KEYS.PHASE];
    if (finalGamePhase !== GAME_PHASES.SELECTING && finalGamePhase !== GAME_PHASES.FINISHED) {
      throw new HttpsError("internal", "Cannot go to selecting or finished from resolved.");
    }

    if (finalGamePhase === GAME_PHASES.SELECTING) {
      return;
    }

    const finalBackToLobbyAt = finalGame[PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT];
    if (typeof finalBackToLobbyAt !== "number") {
      throw new HttpsError("internal", "backToLobbyAt is missing.");
    }
  },
);
