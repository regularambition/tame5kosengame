import {onCall, HttpsError} from "firebase-functions/v2/https";

import {db} from "../firebaseAdmin";

import {
  isValidPushId,
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
  isValidHand,
  HAND_IDS,
  INITIAL_VALUES_IN_BATTLE,
} from "@tame5kosengame/shared";
import type {HandId, SubmitHandRequest, SubmitHandResponse} from "@tame5kosengame/shared";
import {ServerValue} from "firebase-admin/database";
import {findNextPhaseAt} from "./timestampGenerator";

function findManaGain(hand: HandId): number {
  if (hand === HAND_IDS.CHARGE) {
    return 1;
  } else if (hand === HAND_IDS.ATTACK) {
    return -1;
  } else if (hand === HAND_IDS.BEAM) {
    return -5;
  } else {
    return 0;
  }
}

type UidHandPair = {
  uid: string;
  hand: HandId;
};

function findWinnerUid(uhp1: UidHandPair, uhp2: UidHandPair): string {
  const {uid: uid1, hand: hand1} = uhp1;
  const {uid: uid2, hand: hand2} = uhp2;

  if (hand1 === hand2) {
    return "";
  }

  let res = "";
  if (hand1 === HAND_IDS.CHARGE) {
    if (hand2 === HAND_IDS.ATTACK || hand2 === HAND_IDS.BEAM) {
      res = uid2;
    }
  } else if (hand1 === HAND_IDS.DEFENSE) {
    if (hand2 === HAND_IDS.BEAM) {
      res = uid2;
    }
  } else if (hand1 === HAND_IDS.ATTACK) {
    if (hand2 === HAND_IDS.CHARGE) {
      res = uid1;
    } else if (hand2 === HAND_IDS.BEAM) {
      res = uid2;
    }
  } else {
    res = uid1;
  }

  return res;
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

    const {roomId, hand, roundNumber} = request.data;
    console.log(hand);
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
    const hostUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    const guestUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.GUEST).child(GENERAL_ROOM_KEYS.UID).val();
    if (typeof hostUid !== "string" || typeof guestUid !== "string") {
      throw new HttpsError("internal", "Incomplete database.");
    }
    if (uid !== hostUid && uid !== guestUid) {
      throw new HttpsError("failed-precondition", "Invalid user.");
    }

    // const actualMana = roomSnapshot
    //   .child(uid === hostUid ? PRIVATE_ROOM_KEYS.HOST : PRIVATE_ROOM_KEYS.GUEST)
    //   .child(GENERAL_ROOM_KEYS.MANA)
    //   .val();

    const submissionRef = db.ref(
      DATABASE_PATHS_FOR_ROOMS.privateRoomHiddenHand(roomId, roundNumber),
    );
    const submissionResult = await submissionRef.transaction((submission) => {
      submission ??= {};
      submission[GENERAL_ROOM_KEYS.HANDS_OF] ??= {};
      submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS] ??= {};

      const savedHand = submission[GENERAL_ROOM_KEYS.HANDS_OF][uid];
      if (submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS][uid] === true && savedHand !== hand) {
        // transactionを中止する
        return;
      }

      // 同一ラウンドで既に提出済みなら冪等に成功させる
      if (submission[GENERAL_ROOM_KEYS.SUBMITTED_PLAYERS][uid] === true) {
        return submission;
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
    const winnerUid = findWinnerUid(
      {uid: hostUid, hand: handsOf[hostUid]},
      {uid: guestUid, hand: handsOf[guestUid]},
    );

    if (bothSubmitted) {
      const result = await roomRef.transaction((room) => {
        if (room === null || room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING) {
          return room;
        }

        const game = room[GENERAL_ROOM_KEYS.GAME];
        if (
          game?.[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.SELECTING ||
          game?.[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber
        ) {
          return room;
        }

        game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.RESOLVED;

        game[GENERAL_ROOM_KEYS.RESOLVED_ROUND] ??= {};
        const resolvedRound = game[GENERAL_ROOM_KEYS.RESOLVED_ROUND];
        resolvedRound[GENERAL_ROOM_KEYS.ROUND_NUMBER] = roundNumber;
        resolvedRound[GENERAL_ROOM_KEYS.WINNER_UID] = winnerUid;
        resolvedRound[GENERAL_ROOM_KEYS.RESOLVED_AT] = ServerValue.TIMESTAMP;
        resolvedRound[GENERAL_ROOM_KEYS.NEXT_PHASE_AT] = findNextPhaseAt();

        resolvedRound[hostUid] ??= {};
        resolvedRound[hostUid][GENERAL_ROOM_KEYS.SELECTED_HAND] = handsOf[hostUid];

        resolvedRound[guestUid] ??= {};
        resolvedRound[guestUid][GENERAL_ROOM_KEYS.SELECTED_HAND] = handsOf[guestUid];

        if (winnerUid.length === 0) {
          resolvedRound[hostUid][GENERAL_ROOM_KEYS.MANA] += findManaGain(handsOf[hostUid]);
          resolvedRound[guestUid][GENERAL_ROOM_KEYS.MANA] += findManaGain(handsOf[guestUid]);
        } else {
          resolvedRound[hostUid][GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;
          resolvedRound[guestUid][GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;

          resolvedRound[hostUid][GENERAL_ROOM_KEYS.SCORE] += findScoreGain(
            handsOf[hostUid],
            winnerUid,
            hostUid,
          );
          resolvedRound[guestUid][GENERAL_ROOM_KEYS.SCORE] += findScoreGain(
            handsOf[guestUid],
            winnerUid,
            guestUid,
          );
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
      if (finalGame[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== roundNumber) {
        throw new HttpsError("failed-precondition", "Request is not latest round.");
      }
      if (
        finalGame[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.SELECTING &&
        finalGame[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.RESOLVED
      ) {
        throw new HttpsError("failed-precondition", "Invalid game phase.");
      }
    }

    return {hasSucceeded: true};
  },
);
