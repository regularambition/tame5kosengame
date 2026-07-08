import {onCall, HttpsError} from "firebase-functions/v2/https";
import {ServerValue} from "firebase-admin/database";
import {randomInt, createHmac} from "crypto";

import {db} from "../firebaseAdmin";

import {
  isValidMatchPoint,
  isValidThinkingTime,
  JOIN_CODE_RULES,
  isValidJoinCode,
} from "@tame5kosengame/shared";
import type {
  CreatePrivateRoomRequest,
  CreatePrivateRoomResponse,
  EnterPrivateRoomRequest,
  EnterPrivateRoomResponse,
} from "@tame5kosengame/shared";

const ROOM_ID_SPACE_SIZE = 100_000_000;
const MAX_JOIN_CODE_GENERATION_ATTEMPTS = 10;

function generateJoinCode() {
  return randomInt(ROOM_ID_SPACE_SIZE).toString().padStart(JOIN_CODE_RULES.LENGTH, "0");
}

function hashJoinCode(joinCode: string) {
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

    const guestUid = request.auth.uid;
    const {joinCode} = request.data;
    if (!isValidJoinCode(joinCode)) {
      throw new HttpsError("invalid-argument", "Invalid join code.");
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
    if (hostUid === guestUid) {
      throw new HttpsError("failed-precondition", "Host cannot enter as guest.");
    }

    const guestUidRef = roomRef.child("guestUid");
    const result = await guestUidRef.transaction((currentGuestUid) => {
      if (currentGuestUid !== null) {
        return undefined;
      }

      return guestUid;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Private room is already occupied.");
    }

    // await roomRef.child("guestJoinedAt").set(ServerValue.TIMESTAMP);

    return {
      roomId: roomId,
      hostUid: hostUid,
    };
  },
);
