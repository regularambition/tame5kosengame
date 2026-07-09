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
} from "@tame5kosengame/shared";

const ROOM_ID_SPACE_SIZE = 100_000_000;
const MAX_JOIN_CODE_GENERATION_ATTEMPTS = 10;

function generateJoinCode() {
  return randomInt(ROOM_ID_SPACE_SIZE).toString().padStart(JOIN_CODE_RULES.LENGTH, "0");
}

function hashJoinCode(joinCode: string) {
  // Cloud Functionsの環境変数として設定された値を参照
  const secret = process.env.JOIN_CODE_SECRET;

  if (!secret) {
    throw new HttpsError("failed-precondition", "JOIN_CODE_SECRET is not configured.");
  }

  return createHmac("sha256", secret).update(joinCode).digest("hex");
}

async function reserveJoinCode(internalRoomId: string) {
  for (let i = 0; i < MAX_JOIN_CODE_GENERATION_ATTEMPTS; i++) {
    const joinCode = generateJoinCode();
    const joinCodeHash = hashJoinCode(joinCode);
    const joinCodeRef = db.ref(`privateRoomJoinCodes/${joinCodeHash}`);

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
        roomId: internalRoomId,
        createdAt: ServerValue.TIMESTAMP,
      };
    });

    if (result.committed) {
      return {joinCode, joinCodeHash};
    }
  }

  throw new HttpsError("resource-exhausted", "Failed to generate unused join code.");
}

export const createPrivateRoom = onCall<CreatePrivateRoomRequest>(
  {secrets: ["JOIN_CODE_SECRET"]}, // process.env.JOIN_CODE_SECRET による環境変数の参照を有効化
  async (request): Promise<CreatePrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const hostUid = request.auth.uid;
    const {matchPoint, thinkingTime} = request.data;
    if (!isValidMatchPoint(matchPoint) || !isValidThinkingTime(thinkingTime)) {
      throw new HttpsError("invalid-argument", "Invalid match rules.");
    }

    // push実行直後時点ではIDが発行されるだけであって
    // データが作られるのは下のupdateが走って初めてである
    const internalRoomRef = db.ref("privateRooms").push();
    const internalRoomId = internalRoomRef.key;

    if (!internalRoomId) {
      throw new HttpsError("internal", "Failed to generate room id.");
    }

    const {joinCode, joinCodeHash} = await reserveJoinCode(internalRoomId);

    try {
      await db.ref().update({
        [`privateRooms/${internalRoomId}`]: {
          hostUid: hostUid,
          createdAt: ServerValue.TIMESTAMP,
          rules: {
            matchPoint: parseInt(matchPoint),
            thinkingTimeInSec: parseInt(thinkingTime),
          },
          joinCodeHash: joinCodeHash,
          state: ROOM_STATES.PREPARING,
        },
        [`privateRoomJoinCodes/${joinCodeHash}/roomId`]: internalRoomId,
      });
    } catch (error) {
      // multi-location updateはatomicなので「どちらか一方への書き込みだけ成功」
      // という事態は発生せず「全て書き込み成功」または「全て書き込み失敗」の
      // どちらかしか起こり得ないためこのcatchブロックに到達した時点では確実に
      // privateRoomsおよびprivateRoomJoinCodesの両方とも書き込まれていない状態である
      // しかしこの行に到達している時点でハッシュ化された参加コードの予約は終わっているため
      // 後者については明示的に削除処理が必須となる
      await db.ref(`privateRoomJoinCodes/${joinCodeHash}`).remove();
      throw error;
    }

    return {roomId: internalRoomId, joinCode: joinCode};
  },
);

export const enterPrivateRoom = onCall<EnterPrivateRoomRequest>(
  {secrets: ["JOIN_CODE_SECRET"]}, // process.env.JOIN_CODE_SECRET による環境変数の参照を有効化
  async (request): Promise<EnterPrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {joinCode, isPlayer} = request.data;
    if (!isValidJoinCode(joinCode)) {
      throw new HttpsError("invalid-argument", "Invalid join code.");
    }
    if (typeof isPlayer !== "boolean") {
      throw new HttpsError("invalid-argument", "Invalid request.");
    }

    const joinCodeHash = hashJoinCode(joinCode);
    const joinCodeSnapshot = await db.ref(`privateRoomJoinCodes/${joinCodeHash}`).get();
    if (!joinCodeSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const roomId = joinCodeSnapshot.child("roomId").val();
    if (typeof roomId !== "string") {
      throw new HttpsError("internal", "Invalid private room join code data.");
    }

    const roomRef = db.ref(`privateRooms/${roomId}`);
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const hostUid = roomSnapshot.child("hostUid").val();
    if (typeof hostUid !== "string") {
      throw new HttpsError("internal", "Invalid private room data.");
    }
    if (hostUid === uid) {
      throw new HttpsError("failed-precondition", "Host cannot enter as guest.");
    }

    if (isPlayer) {
      const guestUidRef = roomRef.child("guestUid");
      const result = await guestUidRef.transaction((currentGuestUid) => {
        if (currentGuestUid !== null) {
          return undefined;
        }

        return uid;
      });
      if (!result.committed) {
        throw new HttpsError("failed-precondition", "Private room is already occupied.");
      }

      await roomRef.child(`spectators/${uid}`).remove();
    } else {
      const spectatorRef = roomRef.child(`spectators/${uid}`);

      await spectatorRef.set({
        joinedAt: ServerValue.TIMESTAMP,
      });
    }

    return {
      roomId: roomId,
      hostUid: hostUid,
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

    const roomRef = db.ref(`privateRooms/${roomId}`);
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
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

        if (currentRoom.guestUid === null || currentRoom.guestUid === undefined) {
          if (retryCount > 0) {
            --retryCount;
            return currentRoom;
          } else {
            return undefined;
          }
        }

        if (currentRoom.guestUid !== uid) {
          return undefined;
        }

        matchedGuestUid = true;

        const nextRoom = {...currentRoom};
        delete nextRoom.guestUid;

        return nextRoom;
      });
      if (!result.committed || !matchedGuestUid) {
        throw new HttpsError("failed-precondition", "Cannot leave this room.");
      }
    } else if (roomSnapshot.child("guestUid").val() === uid) {
      throw new HttpsError("failed-precondition", "Guest cannot enter as spectator.");
    } else {
      const spectatorRef = roomRef.child(`spectators/${uid}`);
      const spectatorSnapshot = await spectatorRef.get();

      if (!spectatorSnapshot.exists()) {
        throw new HttpsError("failed-precondition", "Cannot leave this room.");
      }

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

    const roomRef = db.ref(`privateRooms/${roomId}`);
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const hostUid = roomSnapshot.child("hostUid").val();
    if (hostUid !== uid) {
      throw new HttpsError("permission-denied", "Only host can delete this room.");
    }

    const joinCodeHash = roomSnapshot.child("joinCodeHash").val();
    const updates: Record<string, string | null> = {
      [`privateRooms/${roomId}/state`]: ROOM_STATES.CLOSED,
    };

    if (typeof joinCodeHash === "string") {
      updates[`privateRoomJoinCodes/${joinCodeHash}`] = null;
    }

    await db.ref().update(updates);

    return {
      hasSucceeded: true,
    };
  },
);
