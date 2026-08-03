import {onTaskDispatched} from "firebase-functions/tasks";
import {PRIVATE_LOBBY_DISCONNECT_TASK_OPTIONS} from "../config";
import {HandlePrivateLobbyDisconnectTask} from "../contracts";
import {HttpsError} from "firebase-functions/v2/https";
import {db} from "../firebaseAdmin";
import {
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
} from "@tame5kosengame/shared";

export const handlePrivateLobbyDisconnect = onTaskDispatched<HandlePrivateLobbyDisconnectTask>(
  PRIVATE_LOBBY_DISCONNECT_TASK_OPTIONS,
  async (request) => {
    const {roomId, uid, reconnectDeadline} = request.data;

    if (Date.now() < reconnectDeadline) {
      throw new HttpsError("failed-precondition", "Reconnect deadline has not arrived.");
    }

    const presenceSnapshot = await db
      .ref(DATABASE_PATHS_FOR_ROOMS.privateRoomPresenceOfUser(roomId, uid))
      .get();

    if (presenceSnapshot.exists()) {
      // 再接続済み
      return;
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));

    let joinCodeHashToDelete: string | null = null;

    const result = await roomRef.transaction((room) => {
      joinCodeHashToDelete = null;

      if (room == null || room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PREPARING) {
        return room;
      }

      const host = room[GENERAL_ROOM_KEYS.HOST];
      const guest = room[GENERAL_ROOM_KEYS.GUEST];

      if (host?.[GENERAL_ROOM_KEYS.UID] === uid) {
        if (host[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE] !== reconnectDeadline) {
          return room;
        }

        if (typeof room[PRIVATE_ROOM_KEYS.JOIN_CODE_HASH] === "string") {
          joinCodeHashToDelete = room[PRIVATE_ROOM_KEYS.JOIN_CODE_HASH];
        }

        // multi-location updateを採用することでstateをclosedに変更するのと
        // 参加コードのDBデータを削除するのとが一貫して堅牢となるためここではまだ変更しない

        // room[GENERAL_ROOM_KEYS.STATE] = ROOM_STATES.CLOSED;

        return room;
      }

      if (guest?.[GENERAL_ROOM_KEYS.UID] === uid) {
        if (guest[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE] !== reconnectDeadline) {
          return room;
        }

        if (host != null) {
          host[PRIVATE_ROOM_KEYS.READY] = false;
        }

        delete room[GENERAL_ROOM_KEYS.GUEST];
        return room;
      }

      // すでに退出済み、キック済み、別ゲストに交代済みのいずれかである場合は一切の更新が不要
      return room;
    });

    if (!result.committed || !result.snapshot.exists()) {
      return;
    }

    // ホスト切断でclosedにした場合は部屋をclosedにしつつ参加コードをDBから削除
    if (joinCodeHashToDelete != null) {
      const updates: Record<string, string | null> = {
        [DATABASE_PATHS_FOR_ROOMS.privateRoomState(roomId)]: ROOM_STATES.CLOSED,
      };
      updates[DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHashToDelete)] = null;

      await db.ref().update(updates);
    }
  },
);
