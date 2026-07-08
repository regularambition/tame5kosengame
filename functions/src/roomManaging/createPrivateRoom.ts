import {onCall, HttpsError} from "firebase-functions/v2/https";
import {ServerValue} from "firebase-admin/database";

import {db} from "../firebaseAdmin";

import {isValidMatchPoint, isValidThinkingTime} from "@tame5kosengame/shared";
import type {CreatePrivateRoomRequest, CreatePrivateRoomResponse} from "@tame5kosengame/shared";

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

    const roomRef = db.ref("privateRooms").push();
    const roomId = roomRef.key;
    if (!roomId) {
      throw new HttpsError("internal", "Failed to generate room id.");
    }

    await roomRef.set({
      id: roomId,
      hostUid,
      createdAt: ServerValue.TIMESTAMP,
      rules: {
        matchPoint: matchPoint,
        thinkingTimeInSec: thinkingTime,
      },
    });

    return {roomId: roomId};
  },
);
