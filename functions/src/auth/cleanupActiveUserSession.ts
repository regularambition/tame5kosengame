import {onValueDeleted} from "firebase-functions/v2/database";

import {db} from "../firebaseAdmin";
import {BACKEND_REGION} from "../config";

import {
  ACTIVE_USER_SESSION_KEYS,
  DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS,
} from "@tame5kosengame/shared";

export const cleanupActiveUserSession = onValueDeleted(
  {
    ref: "/activeUserSessionPresence/" + "{uid}/{sessionId}",
    region: BACKEND_REGION,
    retry: true,
  },
  async (event) => {
    const {uid, sessionId} = event.params;

    const currentPresenceSnapshot = await db
      .ref(DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSessionPresence(uid, sessionId))
      .get();
    if (currentPresenceSnapshot.exists()) {
      // 同じsessionIdで既に再接続している場合はクリーンアップ処理しない
      return;
    }

    const activeSessionRef = db.ref(DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSession(uid));

    await activeSessionRef.transaction((currentSession) => {
      if (currentSession == null) {
        return currentSession;
      }

      if (currentSession[ACTIVE_USER_SESSION_KEYS.SESSION_ID] !== sessionId) {
        // 新しいセッションでの接続が既に確立されている場合は何も更新しない
        return currentSession;
      }

      return null;
    });
  },
);
