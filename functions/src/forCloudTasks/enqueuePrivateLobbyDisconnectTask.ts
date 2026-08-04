import {onValueWritten} from "firebase-functions/v2/database";
import {BACKEND_REGION} from "../config";
import {db} from "../firebaseAdmin";
import {DATABASE_PATHS_FOR_ROOMS, GENERAL_ROOM_KEYS} from "@tame5kosengame/shared";
import {buildTaskPath, isTaskAlreadyAdded, makeTaskId} from "./helpers";
import {HandlePrivateLobbyDisconnectTask} from "../contracts";
import {getFunctions} from "firebase-admin/functions";

function makeHandlePrivateLobbyDisconnectTaskId(
  roomId: string,
  uid: string,
  reconnectDeadline: number,
): string {
  return makeTaskId("handle-private-lobby-disconnect", [roomId, uid, reconnectDeadline]);
}

async function enqueueTask(roomId: string, uid: string, reconnectDeadline: number): Promise<void> {
  const queue = getFunctions().taskQueue(buildTaskPath("handlePrivateLobbyDisconnect"));

  try {
    await queue.enqueue(
      {
        roomId,
        uid,
        reconnectDeadline,
      } satisfies HandlePrivateLobbyDisconnectTask,
      {
        scheduleTime: new Date(reconnectDeadline),

        // 同じ部屋・同じ開始時刻の重複タスクを防ぐ
        id: makeHandlePrivateLobbyDisconnectTaskId(roomId, uid, reconnectDeadline),
      },
    );
  } catch (error) {
    // 通信再試行などで同じタスクを再登録した場合は成功扱い
    if (isTaskAlreadyAdded(error)) {
      return;
    }

    throw error;
  }
}

export const enqueuePrivateLobbyDisconnectTask = onValueWritten(
  {
    ref: "/privateRooms/{roomId}/public/" + "{playerRole}/reconnectDeadline",
    region: BACKEND_REGION,
    retry: true,
  },
  async (event) => {
    if (!event.data.after.exists()) {
      return;
    }

    const reconnectDeadline = event.data.after.val();
    const {roomId, playerRole} = event.params;

    if (
      typeof reconnectDeadline !== "number" ||
      (playerRole !== GENERAL_ROOM_KEYS.HOST && playerRole !== GENERAL_ROOM_KEYS.GUEST)
    ) {
      return;
    }

    const participantSnapshot = await db
      .ref(`${DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId)}` + `/${playerRole}`)
      .get();

    const uid = participantSnapshot.child(GENERAL_ROOM_KEYS.UID).val();

    const currentDeadline = participantSnapshot.child(GENERAL_ROOM_KEYS.RECONNECT_DEADLINE).val();

    if (typeof uid !== "string" || currentDeadline !== reconnectDeadline) {
      return;
    }

    await enqueueTask(roomId, uid, reconnectDeadline);
  },
);
