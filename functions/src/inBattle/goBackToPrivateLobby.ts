import {HttpsError} from "firebase-functions/https";
import {onTaskDispatched} from "firebase-functions/v2/tasks";
import {db} from "../firebaseAdmin";
import {
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
} from "@tame5kosengame/shared";
import {GoBackToPrivateLobbyTask} from "../contracts";
import {PHASE_TRANSITION_TASK_OPTIONS} from "../config";

export const goBackToPrivateLobby = onTaskDispatched<GoBackToPrivateLobbyTask>(
  PHASE_TRANSITION_TASK_OPTIONS,
  async (request) => {
    const {roomId, backToLobbyAt} = request.data;

    const hiddenHandRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoomHiddenHandRoot(roomId));
    const hiddenHandSnapshot = await hiddenHandRef.get();
    if (hiddenHandSnapshot.exists()) {
      await hiddenHandRef.remove();
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const result = await roomRef.transaction((room) => {
      if (room === null) {
        return room;
      }

      const game = room[GENERAL_ROOM_KEYS.GAME];

      // すでに古いタスクなら何もしない
      if (game === null || room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PLAYING) {
        return room;
      }

      const storedBackToLobbyAt = game[PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT];

      // 同じbackToLobbyAtに対するタスクであることを確認
      if (storedBackToLobbyAt !== backToLobbyAt) {
        return room;
      }

      // 念のため、予定時刻より早ければ失敗させて再試行させる
      if (Date.now() < backToLobbyAt) {
        throw new HttpsError("failed-precondition", "backToLobbyAt has not reached its deadline.");
      }

      delete room[GENERAL_ROOM_KEYS.GAME];
      room[GENERAL_ROOM_KEYS.STATE] = ROOM_STATES.PREPARING;

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Cannot commit.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found after transaction.");
    }

    const finalRoom = result.snapshot.val();
    if (finalRoom[GENERAL_ROOM_KEYS.STATE] === null) {
      throw new HttpsError("internal", "state of room is missing.");
    }
  },
);
