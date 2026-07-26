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
} from "@tame5kosengame/shared";
import type {HandId, SubmitHandRequest, SubmitHandResponse} from "@tame5kosengame/shared";
import {ServerValue} from "firebase-admin/database";
import {findNextPhaseAt} from "./timestampGenerator";

import {createHash} from "crypto";
import {getFunctions} from "firebase-admin/functions";
import {buildTaskPath, isTaskAlreadyAdded} from "../forCloudTasks";
import {FinishResolvedPhaseTask} from "../contracts";
import {ALGORITHM_NAME} from "../config";

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

function makeFinishResolvedTaskId(roomId: string, nextPhaseAt: number): string {
  return createHash(ALGORITHM_NAME)
    .update(`finish-resolved:${roomId}:${nextPhaseAt}`)
    .digest("hex");
}

async function enqueueFinishResolvedPhase(
  roomId: string,
  nextPhaseAt: number,
  roundNumber: number,
): Promise<void> {
  const queue = getFunctions().taskQueue(buildTaskPath("finishResolvedPhase"));

  try {
    await queue.enqueue(
      {
        roomId,
        nextPhaseAt,
        roundNumber,
      } satisfies FinishResolvedPhaseTask,
      {
        scheduleTime: new Date(nextPhaseAt),

        // 同じ部屋・同じ開始時刻の重複タスクを防ぐ
        id: makeFinishResolvedTaskId(roomId, nextPhaseAt),
      },
    );
  } catch (error) {
    // 通信再試行などで同じタスクを再登録した場合は成功扱い
    if (isTaskAlreadyAdded(error)) {
      return;
    }

    throw error;
  }
}

export const submitHand = onCall<SubmitHandRequest>(
  async (request): Promise<SubmitHandResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const {roomId, hand, roundNumber} = request.data;
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
    // const actualHostMana = roomSnapshot
    //   .child(GENERAL_ROOM_KEYS.HOST)
    //   .child(GENERAL_ROOM_KEYS.MANA)
    //   .val();
    // const actualGuestMana = roomSnapshot
    //   .child(GENERAL_ROOM_KEYS.GUEST)
    //   .child(GENERAL_ROOM_KEYS.MANA)
    //   .val();
    // if (typeof actualHostMana !== "number" || typeof actualGuestMana !== "number") {
    //   throw new HttpsError("internal", "Database lacks mana.");
    // }
    // const actualHostScore = roomSnapshot
    //   .child(GENERAL_ROOM_KEYS.HOST)
    //   .child(GENERAL_ROOM_KEYS.SCORE)
    //   .val();
    // const actualGuestScore = roomSnapshot
    //   .child(GENERAL_ROOM_KEYS.GUEST)
    //   .child(GENERAL_ROOM_KEYS.SCORE)
    //   .val();
    // if (typeof actualHostScore !== "number" || typeof actualGuestScore !== "number") {
    //   throw new HttpsError("internal", "Database lacks score.");
    // }

    // // const actualMana = uid === hostUid ? actualHostMana : actualGuestMana;
    // // const actualScore = uid === hostUid ? actualHostScore : actualGuestScore;

    const submissionRef = db.ref(
      DATABASE_PATHS_FOR_ROOMS.privateRoomHiddenHand(roomId, roundNumber),
    );
    const submissionResult = await submissionRef.transaction((submission) => {
      submission ??= {};
      submission[GENERAL_ROOM_KEYS.HANDS_OF] ??= {};
      submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS] ??= {};

      const savedHand = submission[GENERAL_ROOM_KEYS.HANDS_OF][uid];
      if (submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS][uid] === true) {
        if (savedHand === hand) {
          // 同一ラウンドで既に提出済みなら冪等に成功させる
          return submission;
        } else {
          // 再試行時に手の書き換えをしようとしている場合は失敗
          return;
        }
      }

      submission[GENERAL_ROOM_KEYS.HANDS_OF][uid] = hand;
      submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS][uid] = true;

      return submission;
    });

    const finalSubmission = submissionResult.snapshot.val();
    const submittedPlayers = finalSubmission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS] ?? {};
    const handsOf = finalSubmission[GENERAL_ROOM_KEYS.HANDS_OF] ?? {};
    if (!submissionResult.committed || submittedPlayers[uid] !== true || handsOf[uid] !== hand) {
      throw new HttpsError("failed-precondition", "Hand submission failed.");
    }

    const bothSubmitted = submittedPlayers[hostUid] === true && submittedPlayers[guestUid] === true;

    if (!bothSubmitted) {
      return {hasSucceeded: true};
    }

    const winnerOfRound = findWinnerOfRound(handsOf[hostUid], handsOf[guestUid]);
    const winnerUid =
      winnerOfRound === WINNER_DETECTION_RESULT.HOST_WON
        ? hostUid
        : winnerOfRound === WINNER_DETECTION_RESULT.GUEST_WON
          ? guestUid
          : "";
    const result = await roomRef.transaction((room) => {
      if (room === null || room[GENERAL_ROOM_KEYS.STATE] === null) {
        return room;
      }

      if (room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING) {
        return;
      }

      const game = room[GENERAL_ROOM_KEYS.GAME];
      if (
        game === null ||
        game[GENERAL_ROOM_KEYS.PHASE] === null ||
        game[GENERAL_ROOM_KEYS.ROUND_NUMBER] === null
      ) {
        return room;
      }

      if (game[GENERAL_ROOM_KEYS.PHASE] === GAME_PHASES.RESOLVED) {
        // 結果を冪等にする
        return room;
      }

      if (
        game[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.SELECTING ||
        game[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber
      ) {
        return;
      }

      game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.RESOLVED;

      game[GENERAL_ROOM_KEYS.RESOLVED_ROUND] ??= {};
      const resolvedRound = game[GENERAL_ROOM_KEYS.RESOLVED_ROUND];
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

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Phase updating failed.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("failed-precondition", "Private room not found. (after transaction)");
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
      finalGame[GENERAL_ROOM_KEYS.ROUND_NUMBER] === null
    ) {
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
    if (finalGame[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber) {
      throw new HttpsError("failed-precondition", "Request is not latest round.");
    }
    if (finalGame[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.RESOLVED) {
      throw new HttpsError("failed-precondition", "Failed to move to resolved phase.");
    }

    const nextPhaseAt =
      finalGame[GENERAL_ROOM_KEYS.RESOLVED_ROUND]?.[GENERAL_ROOM_KEYS.NEXT_PHASE_AT];

    if (typeof nextPhaseAt !== "number") {
      throw new HttpsError("internal", "Resolved phase deadline is missing.");
    }

    await enqueueFinishResolvedPhase(roomId, nextPhaseAt, roundNumber);

    return {hasSucceeded: true};
  },
);
