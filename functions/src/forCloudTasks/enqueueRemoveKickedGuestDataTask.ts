import {onValueWritten} from "firebase-functions/v2/database";
import {BACKEND_REGION} from "../config";
import {db} from "../firebaseAdmin";
import {
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
  ROOM_STATES,
} from "@tame5kosengame/shared";
import {RemoveKickedGuestDataTask} from "../contracts";
import {buildTaskPath, isRetryWindowExpired, isTaskAlreadyAdded, makeTaskId} from "./helpers";
import {getFunctions} from "firebase-admin/functions";
import {logger} from "firebase-functions";

function makeRemoveKickedGuestDataTaskId(roomId: string, guestIsKickedAt: number): string {
  return makeTaskId("remove-kicked-guest-data", [roomId, guestIsKickedAt]);
}

export async function enqueueRemoveKickedGuestData(
  roomId: string,
  guestIsKickedAt: number,
): Promise<void> {
  const queue = getFunctions().taskQueue(buildTaskPath("removeKickedGuestData"));

  try {
    await queue.enqueue(
      {
        roomId,
        guestIsKickedAt,
      } satisfies RemoveKickedGuestDataTask,
      {
        scheduleTime: new Date(guestIsKickedAt),

        // 同じ部屋・同じ開始時刻の重複タスクを防ぐ
        id: makeRemoveKickedGuestDataTaskId(roomId, guestIsKickedAt),
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

export const enqueueRemoveKickedGuestDataTask = onValueWritten(
  {
    ref: "/privateRooms/{roomId}/guestIsKickedAt/",
    region: BACKEND_REGION,
    retry: true,
  },
  async (event) => {
    if (isRetryWindowExpired(event.time)) {
      logger.error("Remove-kicked-guest-data enqueue retry window expired.", {
        roomId: event.params.roomId,
        eventId: event.id,
        eventTime: event.time,
      });
      return;
    }

    try {
      if (!event.data.after.exists()) {
        return;
      }

      const guestIsKickedAt = event.data.after.val();

      if (typeof guestIsKickedAt !== "number") {
        return;
      }

      const roomId = event.params.roomId;
      const roomSnapshot = await db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId)).get();
      if (!roomSnapshot.exists()) {
        return;
      }

      const currentGuestIsKickedAt = roomSnapshot.child(PRIVATE_ROOM_KEYS.GUEST_IS_KICKED_AT).val();
      const currentGuest = roomSnapshot.child(GENERAL_ROOM_KEYS.GUEST).val();
      const currentState = roomSnapshot.child(GENERAL_ROOM_KEYS.STATE).val();
      // イベント発生後に状態が変わっていたら古いイベント
      if (
        currentGuestIsKickedAt !== guestIsKickedAt ||
        currentGuest == null ||
        currentState !== ROOM_STATES.PREPARING
      ) {
        return;
      }

      await enqueueRemoveKickedGuestData(roomId, guestIsKickedAt);
    } catch (error) {
      if (isRetryWindowExpired(event.time)) {
        logger.error("Remove-kicked-guest-data enqueue failed until retry window expired.", {
          roomId: event.params.roomId,
          eventId: event.id,
          eventTime: event.time,
          error,
        });
        return;
      }

      throw error;
    }
  },
);
