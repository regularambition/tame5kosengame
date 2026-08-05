import {HttpsError} from "firebase-functions/v2/https";
import {onTaskDispatched} from "firebase-functions/v2/tasks";

import {db} from "../firebaseAdmin";
import {ACTIVE_USER_SESSION_TASK_OPTIONS} from "../config";

import {
  ACTIVE_USER_SESSION_KEYS,
  DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS,
} from "@tame5kosengame/shared";

import type {ExpireActiveUserSessionTask} from "../contracts";

export const expireActiveUserSession = onTaskDispatched<ExpireActiveUserSessionTask>(
  ACTIVE_USER_SESSION_TASK_OPTIONS,
  async (request) => {
    const {uid, sessionId, reconnectDeadline} = request.data;

    if (Date.now() < reconnectDeadline) {
      throw new HttpsError("failed-precondition", "Reconnect deadline has not arrived.");
    }

    // すでにPresenceが復活していないか確認
    const presenceSnapshot = await db
      .ref(DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSessionPresence(uid, sessionId))
      .get();
    if (presenceSnapshot.exists()) {
      return;
    }

    const activeSessionRef = db.ref(DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSession(uid));
    await activeSessionRef.transaction((currentSession) => {
      if (currentSession == null) {
        return currentSession;
      }

      if (currentSession[ACTIVE_USER_SESSION_KEYS.SESSION_ID] !== sessionId) {
        // すでに別のセッションへ交代済み
        return currentSession;
      }

      if (currentSession[ACTIVE_USER_SESSION_KEYS.RECONNECT_DEADLINE] !== reconnectDeadline) {
        // 再接続済み、または新しい期限に更新済み
        return currentSession;
      }

      return null;
    });
  },
);
