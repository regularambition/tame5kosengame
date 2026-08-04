import {db} from "../firebaseAdmin";

import {
  CONNECTION_STATES,
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
} from "@tame5kosengame/shared";
import {onValueWritten} from "firebase-functions/database";
import {BACKEND_REGION} from "../config";
import {findReconnectDeadline} from "../forCloudTasks";

async function markParticipantAsConnected(roomId: string, uid: string) {
  const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));

  await roomRef.transaction((room) => {
    if (room == null || room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PREPARING) {
      return room;
    }

    const host = room[GENERAL_ROOM_KEYS.HOST];
    const guest = room[GENERAL_ROOM_KEYS.GUEST];

    const participant =
      host?.[GENERAL_ROOM_KEYS.UID] === uid
        ? host
        : guest?.[GENERAL_ROOM_KEYS.UID] === uid
          ? guest
          : null;

    if (participant == null) {
      // 観戦者の場合は個別状態を持たせないなら何もしない
      return room;
    }

    participant[GENERAL_ROOM_KEYS.CONNECTION_STATE] = CONNECTION_STATES.CONNECTED;

    delete participant[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE];

    return room;
  });
}

async function beginReconnectGrace(roomId: string, uid: string) {
  const reconnectDeadline = findReconnectDeadline();

  const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));

  await roomRef.transaction((room) => {
    if (room == null || room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PREPARING) {
      return room;
    }

    const host = room[GENERAL_ROOM_KEYS.HOST];
    const guest = room[GENERAL_ROOM_KEYS.GUEST];

    if (host?.[GENERAL_ROOM_KEYS.UID] === uid) {
      host[PRIVATE_ROOM_KEYS.READY] = false;
      host[GENERAL_ROOM_KEYS.CONNECTION_STATE] = CONNECTION_STATES.RECONNECTING;
      host[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE] = reconnectDeadline;

      // 片方が切断した後にそのまま試合開始しないようにする
      if (guest != null) {
        guest[PRIVATE_ROOM_KEYS.READY] = false;
      }

      return room;
    }

    if (guest?.[GENERAL_ROOM_KEYS.UID] === uid) {
      guest[PRIVATE_ROOM_KEYS.READY] = false;
      guest[GENERAL_ROOM_KEYS.CONNECTION_STATE] = CONNECTION_STATES.RECONNECTING;
      guest[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE] = reconnectDeadline;

      host[PRIVATE_ROOM_KEYS.READY] = false;
      return room;
    }

    // 観戦者の場合
    const spectators = room[PRIVATE_ROOM_KEYS.SPECTATORS];
    if (spectators?.[uid] === true) {
      // 観戦者はゲームの進行に直接関与するわけではないため切断したら即時削除で良し
      delete spectators[uid];
    }

    return room;
  });
}

export const handlePrivateRoomPresenceWritten = onValueWritten(
  {
    ref: "/privateRoomPresence/{roomId}/{uid}/{connectionId}",
    region: BACKEND_REGION,
    retry: true,
  },
  async (event) => {
    const {roomId, uid} = event.params;

    // 現在のPresenceを改めて取得する
    const presenceSnapshot = await db
      .ref(DATABASE_PATHS_FOR_ROOMS.privateRoomPresenceOfUser(roomId, uid))
      .get();

    if (presenceSnapshot.exists()) {
      await markParticipantAsConnected(roomId, uid);
    } else {
      await beginReconnectGrace(roomId, uid);
    }
  },
);
