import {onCall, HttpsError} from "firebase-functions/v2/https";

import {db} from "../firebaseAdmin";

import {
  isValidPushId,
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
} from "@tame5kosengame/shared";
import type {SubmitHandRequest, SubmitHandResponse} from "@tame5kosengame/shared";

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
        return room;
      });
      if (!result.committed) {
        throw new HttpsError("failed-precondition", "Phase updating failed.");
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
