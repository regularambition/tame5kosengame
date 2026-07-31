import {onValueWritten} from "firebase-functions/v2/database";
import {BACKEND_REGION} from "../config";
import {db} from "../firebaseAdmin";
import {
  DATABASE_PATHS_FOR_ROOMS,
  GAME_PHASES,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_KEYS,
} from "@tame5kosengame/shared";
import {GoBackToPrivateLobbyTask} from "../contracts";
import {buildTaskPath, isRetryWindowExpired, isTaskAlreadyAdded, makeTaskId} from "./helpers";
import {getFunctions} from "firebase-admin/functions";
import {logger} from "firebase-functions";

function makeGoBackToPrivateLobbyTaskId(roomId: string, nextPhaseAt: number): string {
  return makeTaskId("go-back-to-private-lobby", [roomId, nextPhaseAt]);
}

async function enqueueGoBackToPrivateLobby(roomId: string, backToLobbyAt: number): Promise<void> {
  const queue = getFunctions().taskQueue(buildTaskPath("goBackToPrivateLobby"));

  try {
    await queue.enqueue(
      {
        roomId,
        backToLobbyAt,
      } satisfies GoBackToPrivateLobbyTask,
      {
        scheduleTime: new Date(backToLobbyAt),

        // 同じ部屋・同じ開始時刻の重複タスクを防ぐ
        id: makeGoBackToPrivateLobbyTaskId(roomId, backToLobbyAt),
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

export const enqueueGoBackToLobbyTask = onValueWritten(
  {
    ref: "/privateRooms/{roomId}/public/game/" + "backToLobbyAt",
    region: BACKEND_REGION,
    retry: true,
  },
  async (event) => {
    if (isRetryWindowExpired(event.time)) {
      logger.error("Go-back-to-lobby enqueue retry window expired.", {
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

      const backToLobbyAt = event.data.after.val();

      if (typeof backToLobbyAt !== "number") {
        return;
      }

      const roomId = event.params.roomId;

      // 現在DBに保存されている値と再照合
      // phase === finishedも確認

      const roomSnapshot = await db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId)).get();

      if (!roomSnapshot.exists()) {
        return;
      }

      const game = roomSnapshot.child(GENERAL_ROOM_KEYS.GAME);

      const phase = game.child(GENERAL_ROOM_KEYS.PHASE).val();
      if (phase !== GAME_PHASES.FINISHED) {
        return;
      }

      const currentBackToLobbyAt = game.child(PRIVATE_ROOM_KEYS.BACK_TO_LOBBY_AT).val();

      // イベント発生後に状態が変わっていたら古いイベント
      if (currentBackToLobbyAt !== backToLobbyAt) {
        return;
      }

      await enqueueGoBackToPrivateLobby(roomId, backToLobbyAt);
    } catch (error) {
      if (isRetryWindowExpired(event.time)) {
        logger.error("Go-back-to-lobby enqueue failed until retry window expired.", {
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
