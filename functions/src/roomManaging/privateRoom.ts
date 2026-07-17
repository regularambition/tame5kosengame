import {onCall, HttpsError} from "firebase-functions/v2/https";
import {ServerValue} from "firebase-admin/database";
import {randomInt, createHmac} from "crypto";

import {db} from "../firebaseAdmin";

import {
  isValidMatchPoint,
  isValidThinkingTime,
  JOIN_CODE_RULES,
  isValidJoinCode,
  isValidPushId,
  ROOM_STATES,
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_JOIN_CODE_KEYS,
  PRIVATE_ROOM_KEYS,
  GAME_PHASES,
  INITIAL_VALUES_IN_BATTLE,
} from "@tame5kosengame/shared";
import type {
  CreatePrivateRoomRequest,
  CreatePrivateRoomResponse,
  EnterPrivateRoomRequest,
  EnterPrivateRoomResponse,
  LeavePrivateRoomRequest,
  LeavePrivateRoomResponse,
  DeletePrivateRoomRequest,
  DeletePrivateRoomResponse,
  MarkAsReadyRequest,
  MarkAsReadyResponse,
} from "@tame5kosengame/shared";
import {findNextPhaseAt} from "../inBattle/timestampGenerator";

const ROOM_ID_SPACE_SIZE = 100_000_000;
const MAX_JOIN_CODE_GENERATION_ATTEMPTS = 10;

function generateJoinCode() {
  return randomInt(ROOM_ID_SPACE_SIZE).toString().padStart(JOIN_CODE_RULES.LENGTH, "0");
}

const JOIN_CODE_SECRET_KEY = "JOIN_CODE_SECRET";
function hashJoinCode(joinCode: string) {
  // Cloud Functionsの環境変数として設定された値を参照
  const secret = process.env[JOIN_CODE_SECRET_KEY];

  if (!secret) {
    throw new HttpsError("failed-precondition", `${JOIN_CODE_SECRET_KEY} is not configured.`);
  }

  return createHmac("sha256", secret).update(joinCode).digest("hex");
}

async function reserveJoinCode(internalRoomId: string) {
  for (let i = 0; i < MAX_JOIN_CODE_GENERATION_ATTEMPTS; i++) {
    const joinCode = generateJoinCode();
    const joinCodeHash = hashJoinCode(joinCode);
    const joinCodeRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHash));

    // transaction処理を導入することにより「nullだから書き込める」
    // と判断して書き込みを行おうとした時に他のリクエストによる処理が割り込んできて
    // DBの状態が変わった場合に再試行が走る（DBの状態が再度評価される）
    // という構造を実現させられるため堅牢な処理を行うことが可能
    const result = await joinCodeRef.transaction((currentData) => {
      if (currentData !== null) {
        // transaction内部でundefinedを返すと中止され
        // 別の参加コードをもとにした作成試行が始まる
        return undefined;
      }

      return {
        [PRIVATE_ROOM_JOIN_CODE_KEYS.ROOM_ID]: internalRoomId,
        [PRIVATE_ROOM_JOIN_CODE_KEYS.CREATED_AT]: ServerValue.TIMESTAMP,
      };
    });

    if (result.committed) {
      return {joinCode, joinCodeHash};
    }
  }

  throw new HttpsError("resource-exhausted", "Failed to generate unused join code.");
}

export const createPrivateRoom = onCall<CreatePrivateRoomRequest>(
  {secrets: [JOIN_CODE_SECRET_KEY]}, // process.env[JOIN_CODE_SECRET_KEY] による環境変数の参照を有効化
  async (request): Promise<CreatePrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const hostUid = request.auth.uid;
    const {matchPoint, thinkingTime, userName} = request.data;
    if (!isValidMatchPoint(matchPoint) || !isValidThinkingTime(thinkingTime)) {
      throw new HttpsError("invalid-argument", "Invalid match rules.");
    }

    // push実行直後時点ではIDが発行されるだけであって
    // データが作られるのは下のupdateが走って初めてである
    const internalRoomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoomsRoot()).push();
    const internalRoomId = internalRoomRef.key;

    if (!internalRoomId) {
      throw new HttpsError("internal", "Failed to generate room id.");
    }

    const {joinCode, joinCodeHash} = await reserveJoinCode(internalRoomId);

    try {
      await db.ref().update({
        [DATABASE_PATHS_FOR_ROOMS.privateRoom(internalRoomId)]: {
          [PRIVATE_ROOM_KEYS.HOST]: {
            [GENERAL_ROOM_KEYS.UID]: hostUid,
            [GENERAL_ROOM_KEYS.NAME]: userName,
            [PRIVATE_ROOM_KEYS.READY]: false,
          },
          [GENERAL_ROOM_KEYS.CREATED_AT]: ServerValue.TIMESTAMP,
          [GENERAL_ROOM_KEYS.RULES]: {
            [GENERAL_ROOM_KEYS.MATCH_POINT]: parseInt(matchPoint),
            [GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC]: parseInt(thinkingTime),
          },
          [PRIVATE_ROOM_KEYS.JOIN_CODE_HASH]: joinCodeHash,
          [GENERAL_ROOM_KEYS.STATE]: ROOM_STATES.PREPARING,
        },
        [DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCodeRoomId(joinCodeHash)]: internalRoomId,
      });
    } catch (error) {
      // multi-location updateはatomicなので「どちらか一方への書き込みだけ成功」
      // という事態は発生せず「全て書き込み成功」または「全て書き込み失敗」の
      // どちらかしか起こり得ないためこのcatchブロックに到達した時点では確実に
      // privateRoomsおよびprivateRoomJoinCodesの両方とも書き込まれていない状態である
      // しかしこの行に到達している時点でハッシュ化された参加コードの予約は終わっているため
      // 後者については明示的に削除処理が必須となる
      await db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHash)).remove();
      throw error;
    }

    return {roomId: internalRoomId, joinCode: joinCode};
  },
);

export const enterPrivateRoom = onCall<EnterPrivateRoomRequest>(
  {secrets: [JOIN_CODE_SECRET_KEY]},
  async (request): Promise<EnterPrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {joinCode, isPlayer, userName} = request.data;
    if (!isValidJoinCode(joinCode)) {
      throw new HttpsError("invalid-argument", "Invalid join code.");
    }
    if (typeof isPlayer !== "boolean") {
      throw new HttpsError("invalid-argument", "Invalid request.");
    }

    const joinCodeHash = hashJoinCode(joinCode);
    const joinCodeSnapshot = await db
      .ref(DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHash))
      .get();
    if (!joinCodeSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const roomId = joinCodeSnapshot.child(PRIVATE_ROOM_JOIN_CODE_KEYS.ROOM_ID).val();
    if (typeof roomId !== "string") {
      throw new HttpsError("internal", "Invalid private room join code data.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const hostUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    if (typeof hostUid !== "string") {
      throw new HttpsError("internal", "Invalid private room data.");
    }
    if (hostUid === uid) {
      throw new HttpsError("failed-precondition", "Host cannot act as guest.");
    }

    const hostName = roomSnapshot.child(PRIVATE_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.NAME).val();
    if (typeof hostName !== "string") {
      throw new HttpsError("internal", "Invalid private room data.");
    }
    const matchPoint = roomSnapshot
      .child(GENERAL_ROOM_KEYS.RULES)
      .child(GENERAL_ROOM_KEYS.MATCH_POINT)
      .val();
    if (typeof matchPoint !== "number") {
      throw new HttpsError("internal", "Invalid private room data.");
    }
    const thinkingTime = roomSnapshot
      .child(GENERAL_ROOM_KEYS.RULES)
      .child(GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC)
      .val();
    if (typeof thinkingTime !== "number") {
      throw new HttpsError("internal", "Invalid private room data.");
    }

    if (isPlayer) {
      const guestUidRef = roomRef.child(PRIVATE_ROOM_KEYS.GUEST);
      const result = await guestUidRef.transaction((currentGuest) => {
        if (currentGuest !== null) {
          return undefined;
        }

        return {
          [GENERAL_ROOM_KEYS.UID]: uid,
          [GENERAL_ROOM_KEYS.NAME]: userName,
          [PRIVATE_ROOM_KEYS.READY]: false,
        };
      });
      if (!result.committed) {
        throw new HttpsError("failed-precondition", "Private room is already occupied.");
      }

      await roomRef.child(PRIVATE_ROOM_KEYS.SPECTATORS).child(uid).remove();
    } else if (
      roomSnapshot.child(PRIVATE_ROOM_KEYS.GUEST).child(GENERAL_ROOM_KEYS.UID).val() === uid
    ) {
      throw new HttpsError("failed-precondition", "Guest cannot act as spectator.");
    } else {
      const spectatorRef = roomRef.child(PRIVATE_ROOM_KEYS.SPECTATORS).child(uid);
      await spectatorRef.set(true);
    }

    return {
      roomId: roomId,
      hostName: hostName,
      matchPoint: matchPoint.toString(),
      thinkingTime: thinkingTime.toString(),
    };
  },
);

export const leavePrivateRoom = onCall<LeavePrivateRoomRequest>(
  async (request): Promise<LeavePrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {isPlayer, roomId} = request.data;
    if (!isValidPushId(roomId)) {
      throw new HttpsError("invalid-argument", "Invalid room ID.");
    }
    if (typeof isPlayer !== "boolean") {
      throw new HttpsError("invalid-argument", "Invalid request.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const hostUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    if (typeof hostUid !== "string") {
      throw new HttpsError("internal", "Invalid private room data.");
    }
    if (hostUid === uid) {
      throw new HttpsError("failed-precondition", "Host cannot act as guest.");
    }

    if (isPlayer) {
      // transactionの初回処理では引数が強制的にnull扱いされる場合があるため
      // 本当にnullになっているのか実際はデータが存在するのにnull扱いされているのかを
      // 区別するために一度きりではなく何度かDBを確認させる必要がある
      let retryCount = 10;
      let matchedGuestUid = false;
      const result = await roomRef.transaction((currentRoom) => {
        if (currentRoom === null) {
          if (retryCount > 0) {
            --retryCount;
            return currentRoom;
          } else {
            return undefined;
          }
        }

        const guest = currentRoom[PRIVATE_ROOM_KEYS.GUEST];
        if (guest === null || guest === undefined) {
          if (retryCount > 0) {
            --retryCount;
            return currentRoom;
          } else {
            return undefined;
          }
        }

        if (currentRoom[PRIVATE_ROOM_KEYS.GUEST][GENERAL_ROOM_KEYS.UID] !== uid) {
          return undefined;
        }

        matchedGuestUid = true;
        const nextRoom = {...currentRoom};
        nextRoom[PRIVATE_ROOM_KEYS.HOST][PRIVATE_ROOM_KEYS.READY] = false;
        delete nextRoom[PRIVATE_ROOM_KEYS.GUEST];
        return nextRoom;
      });
      if (!result.committed || !matchedGuestUid) {
        throw new HttpsError("failed-precondition", "Cannot leave this room.");
      }
    } else if (
      roomSnapshot.child(PRIVATE_ROOM_KEYS.GUEST).child(GENERAL_ROOM_KEYS.UID).val() === uid
    ) {
      throw new HttpsError("failed-precondition", "Guest cannot act as spectator.");
    } else {
      const spectatorRef = roomRef.child(PRIVATE_ROOM_KEYS.SPECTATORS).child(uid);
      await spectatorRef.remove();
    }

    return {
      hasSucceeded: true,
    };
  },
);

export const deletePrivateRoom = onCall<DeletePrivateRoomRequest>(
  async (request): Promise<DeletePrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {roomId} = request.data;
    if (!isValidPushId(roomId)) {
      throw new HttpsError("invalid-argument", "Invalid room ID.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const hostUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    if (hostUid !== uid) {
      throw new HttpsError("permission-denied", "Only host can delete this room.");
    }

    const joinCodeHash = roomSnapshot.child(PRIVATE_ROOM_KEYS.JOIN_CODE_HASH).val();
    const updates: Record<string, string | null> = {
      [DATABASE_PATHS_FOR_ROOMS.privateRoomState(roomId)]: ROOM_STATES.CLOSED,
    };

    if (typeof joinCodeHash === "string") {
      updates[DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHash)] = null;
    }

    await db.ref().update(updates);

    return {
      hasSucceeded: true,
    };
  },
);

export const markAsReady = onCall<MarkAsReadyRequest>(
  async (request): Promise<MarkAsReadyResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {roomId} = request.data;
    if (!isValidPushId(roomId)) {
      throw new HttpsError("invalid-argument", "Invalid room ID.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const hostUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    const guestUid = roomSnapshot.child(PRIVATE_ROOM_KEYS.GUEST).child(GENERAL_ROOM_KEYS.UID).val();
    if (typeof hostUid !== "string" || typeof guestUid !== "string") {
      throw new HttpsError("internal", "Incomplete database.");
    }
    if (uid !== hostUid && uid !== guestUid) {
      throw new HttpsError("failed-precondition", "Invalid user.");
    }

    const result = await roomRef.transaction((room) => {
      if (room === null) {
        return room;
      }
      if (room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PREPARING) {
        return undefined;
      }
      // 過去のリクエストで既に準備完了書き込みが成功している場合は更新せずすぐ終了
      if (hostUid === uid && room[PRIVATE_ROOM_KEYS.HOST]?.[PRIVATE_ROOM_KEYS.READY] === true) {
        return room;
      }
      if (guestUid === uid && room[PRIVATE_ROOM_KEYS.GUEST]?.[PRIVATE_ROOM_KEYS.READY] === true) {
        return room;
      }

      if (hostUid === uid) {
        room[PRIVATE_ROOM_KEYS.HOST][PRIVATE_ROOM_KEYS.READY] = true;
      } else if (guestUid === uid) {
        room[PRIVATE_ROOM_KEYS.GUEST][PRIVATE_ROOM_KEYS.READY] = true;
      } else {
        return undefined;
      }

      if (
        room[PRIVATE_ROOM_KEYS.HOST][PRIVATE_ROOM_KEYS.READY] === true &&
        room[PRIVATE_ROOM_KEYS.GUEST][PRIVATE_ROOM_KEYS.READY] === true
      ) {
        room[GENERAL_ROOM_KEYS.STATE] = ROOM_STATES.PLAYING;

        room[GENERAL_ROOM_KEYS.GAME] ??= {};
        room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.INTRO;
        room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.ROUND_NUMBER] =
          INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER;

        room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.RESOLVED_ROUND] ??= {};
        const resolvedRound = room[GENERAL_ROOM_KEYS.GAME][GENERAL_ROOM_KEYS.RESOLVED_ROUND];

        resolvedRound[hostUid] ??= {};
        resolvedRound[guestUid] ??= {};

        resolvedRound[hostUid][GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;
        resolvedRound[hostUid][GENERAL_ROOM_KEYS.SCORE] = INITIAL_VALUES_IN_BATTLE.SCORE;

        resolvedRound[guestUid][GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;
        resolvedRound[guestUid][GENERAL_ROOM_KEYS.SCORE] = INITIAL_VALUES_IN_BATTLE.SCORE;

        resolvedRound[GENERAL_ROOM_KEYS.RESOLVED_AT] = ServerValue.TIMESTAMP;
        resolvedRound[GENERAL_ROOM_KEYS.NEXT_PHASE_AT] = findNextPhaseAt();
      }

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Cannot mark as ready.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found after transaction.");
    }

    const finalRoom = result.snapshot.val();
    const finalHost = finalRoom[PRIVATE_ROOM_KEYS.HOST];
    const finalGuest = finalRoom[PRIVATE_ROOM_KEYS.GUEST];
    const finalPlayer =
      finalHost?.[GENERAL_ROOM_KEYS.UID] === uid
        ? finalHost
        : finalGuest?.[GENERAL_ROOM_KEYS.UID] === uid
          ? finalGuest
          : null;
    if (finalPlayer?.[PRIVATE_ROOM_KEYS.READY] !== true) {
      throw new HttpsError("failed-precondition", "Player was not marked as ready.");
    }

    return {
      hasSucceeded: true,
    };
  },
);
