import {onCall, HttpsError} from "firebase-functions/v2/https";

import {db} from "../firebaseAdmin";

import {
  isValidPushId,
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  ROOM_STATES,
  isValidHand,
  HAND_IDS,
  findManaGain,
  WINNER_DETECTION_RESULT,
  canSelectHand,
  PRIVATE_ROOM_KEYS,
  CHEATER_DETECTION_RESULT,
  isCheaterDetectionResult,
  isResignerDetectionResult,
} from "@tame5kosengame/shared";
import type {HandId, SubmitHandRequest, SubmitHandResponse} from "@tame5kosengame/shared";
import {ServerValue} from "firebase-admin/database";
import {findBackToLobbyAt, findNextPhaseAt} from "../forCloudTasks";

function findWinnerOfRound(hostHand: HandId, guestHand: HandId) {
  if (hostHand === guestHand) {
    return WINNER_DETECTION_RESULT.DRAW;
  }

  if (hostHand === HAND_IDS.CHARGE) {
    if (guestHand === HAND_IDS.ATTACK || guestHand === HAND_IDS.BEAM) {
      return WINNER_DETECTION_RESULT.GUEST_WON;
    } else {
      return WINNER_DETECTION_RESULT.DRAW;
    }
  } else if (hostHand === HAND_IDS.DEFENSE) {
    if (guestHand === HAND_IDS.BEAM) {
      return WINNER_DETECTION_RESULT.GUEST_WON;
    } else {
      return WINNER_DETECTION_RESULT.DRAW;
    }
  } else if (hostHand === HAND_IDS.ATTACK) {
    if (guestHand === HAND_IDS.CHARGE) {
      return WINNER_DETECTION_RESULT.HOST_WON;
    } else if (guestHand === HAND_IDS.BEAM) {
      return WINNER_DETECTION_RESULT.GUEST_WON;
    } else {
      return WINNER_DETECTION_RESULT.DRAW;
    }
  } else {
    return WINNER_DETECTION_RESULT.HOST_WON;
  }
}

function findScoreGain(winnersHand: HandId, winnerUid: string, uid: string) {
  if (uid !== winnerUid) {
    return 0;
  }

  if (winnersHand === HAND_IDS.ATTACK) {
    return 1;
  } else if (winnersHand === HAND_IDS.BEAM) {
    return 2;
  } else {
    return 0;
  }
}

export const submitHand = onCall<SubmitHandRequest>(
  async (request): Promise<SubmitHandResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const {roomId, hand, roundNumber, myMana} = request.data;
    if (!isValidPushId(roomId)) {
      throw new HttpsError("invalid-argument", "Invalid room ID.");
    }
    if (!isValidHand(hand)) {
      throw new HttpsError("invalid-argument", "Invalid hand.");
    }
    if (typeof roundNumber !== "number") {
      throw new HttpsError("invalid-argument", "Invalid round number.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const uid = request.auth.uid;
    const hostUid = roomSnapshot.child(GENERAL_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    const guestUid = roomSnapshot.child(GENERAL_ROOM_KEYS.GUEST).child(GENERAL_ROOM_KEYS.UID).val();
    if (typeof hostUid !== "string" || typeof guestUid !== "string") {
      throw new HttpsError("internal", "Incomplete database.");
    }
    if (uid !== hostUid && uid !== guestUid) {
      throw new HttpsError("failed-precondition", "Invalid user.");
    }

    // チート対策
    const actualHostMana = roomSnapshot
      .child(GENERAL_ROOM_KEYS.HOST)
      .child(GENERAL_ROOM_KEYS.MANA)
      .val();
    const actualGuestMana = roomSnapshot
      .child(GENERAL_ROOM_KEYS.GUEST)
      .child(GENERAL_ROOM_KEYS.MANA)
      .val();
    if (typeof actualHostMana !== "number" || typeof actualGuestMana !== "number") {
      throw new HttpsError("internal", "Database lacks mana.");
    }
    const actualMana = uid === hostUid ? actualHostMana : actualGuestMana;
    if (myMana !== actualMana || !canSelectHand(hand, actualMana)) {
      // クライアント側がローカルでstateとして管理しているマナの残数を書き換えて
      // 本来ならば選択不可能な手を提出している場合はチート行為なのでその時点で負けとする

      const result = await roomRef.transaction((room) => {
        if (!room || !room[GENERAL_ROOM_KEYS.STATE]) {
          return room;
        }

        if (room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING) {
          return room;
        }

        const game = room[GENERAL_ROOM_KEYS.GAME];
        if (
          !game ||
          !game[GENERAL_ROOM_KEYS.PHASE] ||
          typeof game[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== "number"
        ) {
          return room;
        }

        if (
          game[GENERAL_ROOM_KEYS.PHASE] === GAME_PHASES.FINISHED ||
          isCheaterDetectionResult(game[GENERAL_ROOM_KEYS.CHEATER]) ||
          isResignerDetectionResult(game[GENERAL_ROOM_KEYS.RESIGNER])
        ) {
          // 結果を冪等にする
          // 割り込んできたチート対策処理や降参によって
          // 既に最終的な勝者が決定している場合
          // 手の提出による書き込みは一切行われない
          return room;
        }

        if (
          game[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.SELECTING ||
          game[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber
        ) {
          return room;
        }

        game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.FINISHED;
        if (uid === hostUid) {
          game[GENERAL_ROOM_KEYS.CHEATER] = CHEATER_DETECTION_RESULT.HOST_USED_CHEATING;
          game[GENERAL_ROOM_KEYS.FINAL_WINNER_OF_MATCH] = WINNER_DETECTION_RESULT.GUEST_WON;
        } else {
          game[GENERAL_ROOM_KEYS.CHEATER] = CHEATER_DETECTION_RESULT.GUEST_USED_CHEATING;
          game[GENERAL_ROOM_KEYS.FINAL_WINNER_OF_MATCH] = WINNER_DETECTION_RESULT.HOST_WON;
        }
        game[PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT] = findBackToLobbyAt();

        return room;
      });
      if (!result.committed) {
        throw new HttpsError("failed-precondition", "Phase updating failed (in cheating case).");
      }
      if (!result.snapshot.exists()) {
        throw new HttpsError(
          "failed-precondition",
          "Private room not found (in cheating case). (after transaction)",
        );
      }

      const finalRoom = result.snapshot.val();
      const finalState = finalRoom[GENERAL_ROOM_KEYS.STATE];
      const finalGame = finalRoom[GENERAL_ROOM_KEYS.GAME];
      const finalHost = finalRoom[GENERAL_ROOM_KEYS.HOST];
      const finalGuest = finalRoom[GENERAL_ROOM_KEYS.GUEST];
      if (
        !finalHost ||
        !finalGuest ||
        !finalGame ||
        !finalGame[GENERAL_ROOM_KEYS.PHASE] ||
        typeof finalGame[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== "number"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Private room data is incomplete (in cheating case).",
        );
      }
      if (isResignerDetectionResult(finalGame[GENERAL_ROOM_KEYS.RESIGNER])) {
        // 相手の降参が先に割り込んできている場合はすぐさま終了
        return {hasSucceeded: true};
      }
      if (finalState !== ROOM_STATES.PLAYING) {
        throw new HttpsError(
          "failed-precondition",
          "Private room is not playing (in cheating case).",
        );
      }

      const finalPlayer =
        finalHost[GENERAL_ROOM_KEYS.UID] === uid
          ? finalHost
          : finalGuest[GENERAL_ROOM_KEYS.UID] === uid
            ? finalGuest
            : null;
      if (finalPlayer === null) {
        throw new HttpsError("permission-denied", "User is not a player (in cheating case).");
      }
      if (finalGame[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber) {
        throw new HttpsError(
          "failed-precondition",
          "Request is not latest round (in cheating case).",
        );
      }
      if (finalGame[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.FINISHED) {
        throw new HttpsError(
          "failed-precondition",
          "Failed to move to finished phase (in cheating case).",
        );
      }

      // 既に相手がチートを使っている場合はすぐさま終了
      if (
        (finalPlayer === finalHost &&
          finalGame[GENERAL_ROOM_KEYS.CHEATER] === CHEATER_DETECTION_RESULT.GUEST_USED_CHEATING) ||
        (finalPlayer === finalGuest &&
          finalGame[GENERAL_ROOM_KEYS.CHEATER] === CHEATER_DETECTION_RESULT.HOST_USED_CHEATING)
      ) {
        return {hasSucceeded: true};
      }

      const finalBackToLobbyAt = finalGame[PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT];

      if (typeof finalBackToLobbyAt !== "number") {
        throw new HttpsError("internal", "backToLobbyAt is missing (in cheating case).");
      }

      return {hasSucceeded: true};
    }

    const roomContainerRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoomContainer(roomId));
    const submissionResult = await roomContainerRef.transaction((roomContainer) => {
      if (roomContainer == null) {
        return roomContainer;
      }

      const currentRoom = roomContainer[GENERAL_ROOM_KEYS.PUBLIC];
      const currentGame = currentRoom?.[GENERAL_ROOM_KEYS.GAME];
      if (
        isCheaterDetectionResult(currentGame[GENERAL_ROOM_KEYS.CHEATER]) ||
        isResignerDetectionResult(currentGame[GENERAL_ROOM_KEYS.RESIGNER])
      ) {
        // 結果を冪等にする
        // 割り込んできたチート対策処理や降参によって
        // 既に最終的な勝者が決定している場合
        // 手の提出による書き込みは一切行われない
        return roomContainer;
      }

      const currentHostUid = currentRoom?.[GENERAL_ROOM_KEYS.HOST]?.[GENERAL_ROOM_KEYS.UID];
      const currentGuestUid = currentRoom?.[GENERAL_ROOM_KEYS.GUEST]?.[GENERAL_ROOM_KEYS.UID];
      if (
        currentRoom?.[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING ||
        currentGame?.[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.SELECTING ||
        currentGame?.[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber ||
        (uid !== currentHostUid && uid !== currentGuestUid)
      ) {
        return roomContainer;
      }

      roomContainer[GENERAL_ROOM_KEYS.CONFIDENTIAL] ??= {};
      const confidential = roomContainer[GENERAL_ROOM_KEYS.CONFIDENTIAL];
      confidential[roundNumber] ??= {};
      const submission = confidential[roundNumber];
      submission[GENERAL_ROOM_KEYS.HANDS_OF] ??= {};
      submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS] ??= {};

      if (submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS][uid] === true) {
        // 同一ラウンドで既に提出済みなら冪等に成功させる
        // ただし手の書き換えをしようとしている場合は失敗させる
        return roomContainer;
      }

      submission[GENERAL_ROOM_KEYS.HANDS_OF][uid] = hand;
      submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS][uid] = true;

      const handsOf = submission[GENERAL_ROOM_KEYS.HANDS_OF];
      const submittedPlayers = submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS];

      const bothSubmitted =
        submittedPlayers[hostUid] === true && submittedPlayers[guestUid] === true;
      if (!bothSubmitted) {
        // 二人の提出がまだ揃っていない場合はこれ以上更新せずすぐに正常終了
        return roomContainer;
      }

      const winnerOfRound = findWinnerOfRound(handsOf[hostUid], handsOf[guestUid]);
      const winnerUid =
        winnerOfRound === WINNER_DETECTION_RESULT.HOST_WON
          ? hostUid
          : winnerOfRound === WINNER_DETECTION_RESULT.GUEST_WON
            ? guestUid
            : "";

      currentGame[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.RESOLVED;
      const resolvedRound = currentGame[GENERAL_ROOM_KEYS.RESOLVED_ROUND];
      resolvedRound[GENERAL_ROOM_KEYS.ROUND_NUMBER] = roundNumber;
      resolvedRound[GENERAL_ROOM_KEYS.WINNER_OF_ROUND] = winnerOfRound;
      resolvedRound[GENERAL_ROOM_KEYS.RESOLVED_AT] = ServerValue.TIMESTAMP;
      resolvedRound[GENERAL_ROOM_KEYS.NEXT_PHASE_AT] = findNextPhaseAt();

      resolvedRound[GENERAL_ROOM_KEYS.HOST] ??= {};
      resolvedRound[GENERAL_ROOM_KEYS.GUEST] ??= {};

      const resRoundHost = resolvedRound[GENERAL_ROOM_KEYS.HOST];
      const resRoundGuest = resolvedRound[GENERAL_ROOM_KEYS.GUEST];

      resRoundHost[GENERAL_ROOM_KEYS.SELECTED_HAND] = handsOf[hostUid];
      resRoundGuest[GENERAL_ROOM_KEYS.SELECTED_HAND] = handsOf[guestUid];

      resRoundHost[GENERAL_ROOM_KEYS.SCORE_GAIN] = findScoreGain(
        handsOf[hostUid],
        winnerUid,
        hostUid,
      );
      resRoundGuest[GENERAL_ROOM_KEYS.SCORE_GAIN] = findScoreGain(
        handsOf[guestUid],
        winnerUid,
        guestUid,
      );

      if (winnerOfRound === WINNER_DETECTION_RESULT.DRAW) {
        resRoundHost[GENERAL_ROOM_KEYS.MANA_GAIN] = findManaGain(handsOf[hostUid]);
        resRoundGuest[GENERAL_ROOM_KEYS.MANA_GAIN] = findManaGain(handsOf[guestUid]);
      }

      return roomContainer;
    });

    if (!submissionResult.snapshot.exists()) {
      throw new HttpsError("failed-precondition", "Database is broken.");
    }

    const finalRoomContainer = submissionResult.snapshot.val();
    const finalRoom = finalRoomContainer?.[GENERAL_ROOM_KEYS.PUBLIC] ?? {};
    const finalGame = finalRoom?.[GENERAL_ROOM_KEYS.GAME] ?? {};
    if (
      isCheaterDetectionResult(finalGame[GENERAL_ROOM_KEYS.CHEATER]) ||
      isResignerDetectionResult(finalGame[GENERAL_ROOM_KEYS.RESIGNER])
    ) {
      // チート対策処理や降参が先に割り込んできている場合はすぐさま終了
      return {hasSucceeded: true};
    }

    if (
      finalRoom?.[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING ||
      (finalGame?.[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.SELECTING &&
        finalGame?.[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.RESOLVED) ||
      finalGame?.[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber ||
      (uid !== hostUid && uid !== guestUid)
    ) {
      throw new HttpsError("failed-precondition", "Hand cannot be submitted now.");
    }

    const finalSubmission =
      finalRoomContainer?.[GENERAL_ROOM_KEYS.CONFIDENTIAL]?.[roundNumber] ?? {};
    const finalSubmittedPlayers = finalSubmission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS] ?? {};
    const finalHandsOf = finalSubmission[GENERAL_ROOM_KEYS.HANDS_OF] ?? {};
    if (
      !submissionResult.committed ||
      finalSubmittedPlayers[uid] !== true ||
      finalHandsOf[uid] !== hand
    ) {
      throw new HttpsError("failed-precondition", "Hand submission failed.");
    }

    const finalBothSubmitted =
      finalSubmittedPlayers[hostUid] === true && finalSubmittedPlayers[guestUid] === true;
    if (!finalBothSubmitted) {
      // 二人の提出がまだ揃っていない場合はこれ以上更新せずすぐに正常終了
      return {hasSucceeded: true};
    }

    const finalWinnerOfRound = findWinnerOfRound(finalHandsOf[hostUid], finalHandsOf[guestUid]);
    const finalWinnerUid =
      finalWinnerOfRound === WINNER_DETECTION_RESULT.HOST_WON
        ? hostUid
        : finalWinnerOfRound === WINNER_DETECTION_RESULT.GUEST_WON
          ? guestUid
          : "";

    const finalResolvedRound = finalGame?.[GENERAL_ROOM_KEYS.RESOLVED_ROUND] ?? {};
    const finalResRoundHost = finalResolvedRound?.[GENERAL_ROOM_KEYS.HOST] ?? {};
    const finalResRoundGuest = finalResolvedRound?.[GENERAL_ROOM_KEYS.GUEST] ?? {};
    const finalHostScoreGain = findScoreGain(finalHandsOf[hostUid], finalWinnerUid, hostUid);
    const finalGuestScoreGain = findScoreGain(finalHandsOf[guestUid], finalWinnerUid, guestUid);
    if (
      finalGame[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.RESOLVED ||
      finalResolvedRound[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber ||
      finalResolvedRound[GENERAL_ROOM_KEYS.WINNER_OF_ROUND] !== finalWinnerOfRound ||
      typeof finalResolvedRound[GENERAL_ROOM_KEYS.RESOLVED_AT] !== "number" ||
      typeof finalResolvedRound[GENERAL_ROOM_KEYS.NEXT_PHASE_AT] !== "number" ||
      finalResRoundHost[GENERAL_ROOM_KEYS.SCORE_GAIN] !== finalHostScoreGain ||
      finalResRoundGuest[GENERAL_ROOM_KEYS.SCORE_GAIN] !== finalGuestScoreGain
    ) {
      throw new HttpsError("failed-precondition", "Failed to record when both submitted.");
    }

    if (finalWinnerOfRound === WINNER_DETECTION_RESULT.DRAW) {
      if (
        finalResRoundHost[GENERAL_ROOM_KEYS.MANA_GAIN] !== findManaGain(finalHandsOf[hostUid]) ||
        finalResRoundGuest[GENERAL_ROOM_KEYS.MANA_GAIN] !== findManaGain(finalHandsOf[guestUid])
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Failed to record when both submitted(case of draw).",
        );
      }
    }

    return {hasSucceeded: true};
  },
);
