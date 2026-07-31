import {db} from "../firebaseAdmin";
import {DATABASE_PATHS_FOR_ROOMS, GAME_PHASES, GENERAL_ROOM_KEYS} from "@tame5kosengame/shared";
import {onValueWritten} from "firebase-functions/v2/database";
import {getFunctions} from "firebase-admin/functions";
import {buildTaskPath, isRetryWindowExpired, isTaskAlreadyAdded, makeTaskId} from "./helpers";
import {FinishIntroPhaseTask, FinishResolvedPhaseTask} from "../contracts";
import {BACKEND_REGION} from "../config";
import {logger} from "firebase-functions";

function makeFinishIntroTaskId(roomId: string, nextPhaseAt: number): string {
  return makeTaskId("finish-intro", [roomId, nextPhaseAt]);
}

async function enqueueFinishIntroPhase(roomId: string, nextPhaseAt: number): Promise<void> {
  const queue = getFunctions().taskQueue(buildTaskPath("finishIntroPhase"));

  try {
    await queue.enqueue(
      {
        roomId,
        nextPhaseAt,
      } satisfies FinishIntroPhaseTask,
      {
        scheduleTime: new Date(nextPhaseAt),

        // 同じ部屋・同じ開始時刻の重複タスクを防ぐ
        id: makeFinishIntroTaskId(roomId, nextPhaseAt),
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

function makeFinishResolvedTaskId(
  roomId: string,
  nextPhaseAt: number,
  roundNumber: number,
): string {
  return makeTaskId("finish-resolved", [roomId, nextPhaseAt, roundNumber]);
}

async function enqueueFinishResolvedPhase(
  roomId: string,
  nextPhaseAt: number,
  roundNumber: number,
): Promise<void> {
  const queue = getFunctions().taskQueue(buildTaskPath("finishResolvedPhase"));

  try {
    await queue.enqueue(
      {
        roomId,
        nextPhaseAt,
        roundNumber,
      } satisfies FinishResolvedPhaseTask,
      {
        scheduleTime: new Date(nextPhaseAt),

        // 同じ部屋・同じ開始時刻の重複タスクを防ぐ
        id: makeFinishResolvedTaskId(roomId, nextPhaseAt, roundNumber),
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

export const enqueuePhaseTransitionTask = onValueWritten(
  {
    ref: "/privateRooms/{roomId}/public/game/" + "resolvedRound/nextPhaseAt",
    region: BACKEND_REGION,
    retry: true,
  },
  async (event) => {
    // 元のDBイベント発生から2分以上経過した再試行は成功扱いで破棄
    if (isRetryWindowExpired(event.time)) {
      logger.error("Phase transition enqueue retry window expired.", {
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

      const nextPhaseAt = event.data.after.val();

      if (typeof nextPhaseAt !== "number") {
        return;
      }

      const roomId = event.params.roomId;

      const roomSnapshot = await db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId)).get();

      if (!roomSnapshot.exists()) {
        return;
      }

      const game = roomSnapshot.child(GENERAL_ROOM_KEYS.GAME);

      const phase = game.child(GENERAL_ROOM_KEYS.PHASE).val();

      const roundNumber = game.child(GENERAL_ROOM_KEYS.ROUND_NUMBER).val();

      const currentNextPhaseAt = game
        .child(GENERAL_ROOM_KEYS.RESOLVED_ROUND)
        .child(GENERAL_ROOM_KEYS.NEXT_PHASE_AT)
        .val();

      // イベント発生後に状態が変わっていたら古いイベント
      if (currentNextPhaseAt !== nextPhaseAt) {
        return;
      }

      if (phase === GAME_PHASES.INTRO) {
        await enqueueFinishIntroPhase(roomId, nextPhaseAt);
        return;
      }

      if (phase === GAME_PHASES.RESOLVED && typeof roundNumber === "number") {
        await enqueueFinishResolvedPhase(roomId, nextPhaseAt, roundNumber);
      }
    } catch (error) {
      // 処理中に2分を超えた場合も、それ以上再試行させない
      if (isRetryWindowExpired(event.time)) {
        logger.error("Phase transition enqueue failed until retry window expired.", {
          roomId: event.params.roomId,
          eventId: event.id,
          eventTime: event.time,
          error,
        });
        return;
      }

      // 2分以内なら例外を投げ、Eventarcに再試行させる
      throw error;
    }
  },
);
