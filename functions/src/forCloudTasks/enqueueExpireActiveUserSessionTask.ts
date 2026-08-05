import {getFunctions} from "firebase-admin/functions";

import {ExpireActiveUserSessionTask} from "../contracts";
import {buildTaskPath, isTaskAlreadyAdded, makeTaskId} from "./helpers";

function makeExpireActiveUserSessionTaskId(
  uid: string,
  sessionId: string,
  reconnectDeadline: number,
): string {
  return makeTaskId("expire-active-user-session", [uid, sessionId, reconnectDeadline]);
}

export async function enqueueExpireActiveUserSessionTask(
  uid: string,
  sessionId: string,
  reconnectDeadline: number,
): Promise<void> {
  const queue = getFunctions().taskQueue(buildTaskPath("expireActiveUserSession"));

  try {
    await queue.enqueue(
      {
        uid,
        sessionId,
        reconnectDeadline,
      } satisfies ExpireActiveUserSessionTask,
      {
        scheduleTime: new Date(reconnectDeadline),
        id: makeExpireActiveUserSessionTaskId(uid, sessionId, reconnectDeadline),
      },
    );
  } catch (error) {
    if (isTaskAlreadyAdded(error)) {
      return;
    }

    throw error;
  }
}
