import {HttpsError} from "firebase-functions/https";
import {onTaskDispatched} from "firebase-functions/v2/tasks";
import {db} from "../firebaseAdmin";
import {
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
} from "@tame5kosengame/shared";
import {RemoveKickedGuestDataTask} from "../contracts";
import {KICKING_TASK_OPTIONS} from "../config";

export const removeKickedGuestData = onTaskDispatched<RemoveKickedGuestDataTask>(
  KICKING_TASK_OPTIONS,
  async (request) => {
    const {roomId, guestIsKickedAt} = request.data;
    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const result = await roomRef.transaction((room) => {
      if (room == null) {
        return room;
      }

      if (room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PREPARING) {
        return room;
      }

      const guest = room[GENERAL_ROOM_KEYS.GUEST];
      if (guest == null) {
        return room;
      }

      const storedGuestIsKickedAt = room[PRIVATE_ROOM_KEYS.GUEST_IS_KICKED_AT];

      // 同じタスクであることを確認
      if (storedGuestIsKickedAt !== guestIsKickedAt) {
        return room;
      }

      // 念のため、予定時刻より早ければ失敗させて再試行させる
      if (Date.now() < guestIsKickedAt) {
        throw new HttpsError("failed-precondition", "Time of guestIsKickedAt has not arrived yet.");
      }

      delete room[GENERAL_ROOM_KEYS.GUEST];
      delete room[PRIVATE_ROOM_KEYS.GUEST_IS_KICKED_AT];

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Cannot commit.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found after transaction.");
    }

    const finalRoom = result.snapshot.val();
    const finalState = finalRoom[GENERAL_ROOM_KEYS.STATE];
    if (finalState !== ROOM_STATES.PREPARING) {
      throw new HttpsError("failed-precondition", "room is not in preparing state.");
    }

    const finalGuest = finalRoom[GENERAL_ROOM_KEYS.GUEST];
    const finalGuestIsKickedAt = finalRoom[PRIVATE_ROOM_KEYS.GUEST_IS_KICKED_AT];
    if (finalGuest != null || finalGuestIsKickedAt != null) {
      throw new HttpsError("internal", "failed to remove guest data.");
    }
  },
);
