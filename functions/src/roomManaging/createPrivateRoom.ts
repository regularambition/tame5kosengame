import {onCall, HttpsError} from "firebase-functions/v2/https";
import {ServerValue} from "firebase-admin/database";
import {randomInt} from "crypto";

import {db} from "../firebaseAdmin";

import {isValidMatchPoint, isValidThinkingTime} from "@tame5kosengame/shared";
import type {CreatePrivateRoomRequest, CreatePrivateRoomResponse} from "@tame5kosengame/shared";

const ROOM_ID_SPACE_SIZE = 100_000_000;
const MAX_ROOM_ID_GENERATION_ATTEMPTS = 10;

function generateRoomId() {
  return randomInt(ROOM_ID_SPACE_SIZE).toString().padStart(8, "0");
}

async function createPrivateRoomData(
  hostUid: string,
  matchPoint: number,
  thinkingTimeInSec: number,
) {
  for (let i = 0; i < MAX_ROOM_ID_GENERATION_ATTEMPTS; i++) {
    const roomId = generateRoomId();
    const roomRef = db.ref(`privateRooms/${roomId}`);

    const result = await roomRef.transaction((currentData) => {
      if (currentData !== null) {
        // transaction内部でundefinedを返すと中止され別IDによる作成試行が始まる
        return undefined;
      }

      return {
        hostUid,
        createdAt: ServerValue.TIMESTAMP,
        rules: {
          matchPoint,
          thinkingTimeInSec,
        },
      };
    });

    if (result.committed) {
      return {roomId, roomRef};
    }
  }

  throw new HttpsError("resource-exhausted", "Failed to generate unused room id.");
}

export const createPrivateRoom = onCall<CreatePrivateRoomRequest>(
  async (request): Promise<CreatePrivateRoomResponse> => {
    // Firebase Authenticationでログイン済みか確認
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const hostUid = request.auth.uid;
    const {matchPoint, thinkingTime} = request.data;
    if (!isValidMatchPoint(matchPoint) || !isValidThinkingTime(thinkingTime)) {
      throw new HttpsError("invalid-argument", "Invalid match rules.");
    }

    const roomData = await createPrivateRoomData(
      hostUid,
      parseInt(matchPoint),
      parseInt(thinkingTime),
    );

    return {roomId: roomData.roomId};
  },
);
