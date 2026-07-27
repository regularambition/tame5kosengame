import {onCall, HttpsError} from "firebase-functions/v2/https";

import {db} from "../firebaseAdmin";

import {
  isValidPushId,
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  ROOM_STATES,
  WINNER_DETECTION_RESULT,
  PRIVATE_ROOM_KEYS,
  RESIGNER_DETECTION_RESULT,
  isResignerDetectionResult,
  isCheaterDetectionResult,
} from "@tame5kosengame/shared";
import type {ResignRequest, ResignResponse} from "@tame5kosengame/shared";

import {findBackToLobbyAt} from "./timestampGenerator";

import {enqueueGoBackToPrivateLobby} from "./finishResolvedPhase";

export const resign = onCall<ResignRequest>(async (request): Promise<ResignResponse> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const {roomId, isPrivateMatch} = request.data;
  if (!isValidPushId(roomId)) {
    throw new HttpsError("invalid-argument", "Invalid room ID.");
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

  const result = await roomRef.transaction((room) => {
    if (room === null || room[GENERAL_ROOM_KEYS.STATE] === null) {
      return room;
    }

    if (room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING) {
      return;
    }

    const game = room[GENERAL_ROOM_KEYS.GAME];
    if (game === null || game[GENERAL_ROOM_KEYS.PHASE] === null) {
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
      // 降参を選択したことによる書き込みは一切行われない
      return room;
    }

    game[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.FINISHED;
    if (uid === hostUid) {
      game[GENERAL_ROOM_KEYS.RESIGNER] = RESIGNER_DETECTION_RESULT.HOST_RESIGNED;
      game[GENERAL_ROOM_KEYS.FINAL_WINNER_OF_MATCH] = WINNER_DETECTION_RESULT.GUEST_WON;
    } else {
      game[GENERAL_ROOM_KEYS.RESIGNER] = RESIGNER_DETECTION_RESULT.GUEST_RESIGNED;
      game[GENERAL_ROOM_KEYS.FINAL_WINNER_OF_MATCH] = WINNER_DETECTION_RESULT.HOST_WON;
    }

    if (isPrivateMatch) {
      game[PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT] = findBackToLobbyAt();
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
  if (!finalHost || !finalGuest || !finalGame || !finalGame[GENERAL_ROOM_KEYS.PHASE]) {
    throw new HttpsError("failed-precondition", "Private room data is incomplete.");
  }
  if (isCheaterDetectionResult(finalGame[GENERAL_ROOM_KEYS.CHEATER])) {
    // チート対策処理が先に割り込んできている場合はすぐさま終了
    return {hasSucceeded: true};
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
  if (finalGame[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.FINISHED) {
    throw new HttpsError("failed-precondition", "Failed to move to finished phase.");
  }

  // 既に相手が降参を選んでいる場合はすぐさま終了
  if (
    (finalPlayer === finalHost &&
      finalGame[GENERAL_ROOM_KEYS.RESIGNER] === RESIGNER_DETECTION_RESULT.GUEST_RESIGNED) ||
    (finalPlayer === finalGuest &&
      finalGame[GENERAL_ROOM_KEYS.RESIGNER] === RESIGNER_DETECTION_RESULT.HOST_RESIGNED)
  ) {
    return {hasSucceeded: true};
  }

  if (isPrivateMatch) {
    const finalBackToLobbyAt = finalGame[PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT];

    if (typeof finalBackToLobbyAt !== "number") {
      throw new HttpsError("internal", "backToLobbyAt is missing.");
    }
    await enqueueGoBackToPrivateLobby(roomId, finalBackToLobbyAt);
  }

  return {hasSucceeded: true};
});
