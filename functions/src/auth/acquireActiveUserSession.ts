import {onCall, HttpsError} from "firebase-functions/v2/https";
import {ServerValue} from "firebase-admin/database";

import {db} from "../firebaseAdmin";

import {
  ACTIVE_USER_SESSION_KEYS,
  DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS,
  isValidPushId,
} from "@tame5kosengame/shared";

import type {
  AcquireActiveUserSessionRequest,
  AcquireActiveUserSessionResponse,
} from "@tame5kosengame/shared";

export const acquireActiveUserSession = onCall<AcquireActiveUserSessionRequest>(
  async (request): Promise<AcquireActiveUserSessionResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {sessionId} = request.data;

    if (!isValidPushId(sessionId)) {
      throw new HttpsError("invalid-argument", "Invalid session ID.");
    }

    // このsessionIdのPresenceが存在することを確認
    const presenceRef = db.ref(
      DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSessionPresence(uid, sessionId),
    );

    const presenceSnapshot = await presenceRef.get();
    if (!presenceSnapshot.exists()) {
      throw new HttpsError("failed-precondition", "Session presence does not exist.");
    }

    const activeSessionRef = db.ref(DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSession(uid));

    const result = await activeSessionRef.transaction((currentSession) => {
      if (currentSession == null) {
        return {
          [ACTIVE_USER_SESSION_KEYS.SESSION_ID]: sessionId,
          [ACTIVE_USER_SESSION_KEYS.CLAIMED_AT]: ServerValue.TIMESTAMP,
        };
      }

      const currentSessionId = currentSession[ACTIVE_USER_SESSION_KEYS.SESSION_ID];
      if (currentSessionId !== sessionId) {
        // 別セッションで既に接続中の場合はtransactionブロック後に失敗扱いとする
        return currentSession;
      }

      // 同じセッションからの再試行・再接続は成功扱いとして再接続期限も消す
      delete currentSession[ACTIVE_USER_SESSION_KEYS.RECONNECT_DEADLINE];
      return currentSession;
    });

    if (!result.committed) {
      throw new HttpsError("already-exists", "Another game session is already active.");
    }

    if (!result.snapshot.exists()) {
      throw new HttpsError("internal", "Database is broken(game session).");
    }

    const finalActiveSession = result.snapshot.val();
    const finalSessionId = finalActiveSession[ACTIVE_USER_SESSION_KEYS.SESSION_ID];
    if (finalSessionId !== sessionId) {
      throw new HttpsError("already-exists", "Another game session is already active.");
    }

    return {
      hasSucceeded: true,
    };
  },
);
