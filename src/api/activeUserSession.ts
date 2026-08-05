import {
  DatabaseReference,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
} from "firebase/database";

import {auth, database, getCallableFunction} from "../firebase";
import {
  DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS,
  ACTIVE_USER_SESSION_KEYS,
  PRIMITIVE_RTDB_PATHS,
  AcquireActiveUserSessionRequest,
  AcquireActiveUserSessionResponse,
} from "@tame5kosengame/shared";
import {FirebaseError} from "firebase/app";

export class AlreadyLoggedInError extends Error {
  constructor() {
    super("Another active session already exists.");
    this.name = "AlreadyLoggedInError";
  }
}

async function requestAcquireActiveUserSession(sessionId: string): Promise<void> {
  const callable = getCallableFunction<
    AcquireActiveUserSessionRequest,
    AcquireActiveUserSessionResponse
  >("acquireActiveUserSession");

  await callable({
    sessionId,
  });
}

const SESSION_ACQUIRE_RETRY_INTERVAL_MS = 500;
const SESSION_ACQUIRE_MAX_ATTEMPTS = 10;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAlreadyExistsError(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === "functions/already-exists";
}

async function acquireActiveUserSessionWithRetry(sessionId: string): Promise<void> {
  // 接続中のタブで再読み込みを行った場合には
  // 古い接続のonDisconnectが発火するよりも早い時点において
  // 新しいセッションが払い出されることにより「既に別セッションが接続済み」と見られ
  // 理論的には新しいセッションで接続成功しなければならないのに失敗となる場合がある
  // これを回避するために一定時間再試行を続け最後まで「既に別セッションが接続済み」
  // と判定された場合のみそのように判定されるような機構を実現する

  for (let attempt = 1; attempt <= SESSION_ACQUIRE_MAX_ATTEMPTS; ++attempt) {
    try {
      await requestAcquireActiveUserSession(sessionId);
      return;
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        // 「既に別セッションが接続済み」以外の原因によるエラーならば再試行しない
        throw error;
      }

      if (attempt === SESSION_ACQUIRE_MAX_ATTEMPTS) {
        throw new AlreadyLoggedInError();
      }

      await wait(SESSION_ACQUIRE_RETRY_INTERVAL_MS);
    }
  }
}

type StartActiveUserSessionOptions = {
  onSessionLost?: () => void;
};

export async function startActiveUserSession(
  options: StartActiveUserSessionOptions = {},
): Promise<() => Promise<void>> {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("Authentication required.");
  }

  let stopped = false;
  let presenceIsActive = false;
  let isClaiming = false;

  let resolveInitialClaim!: () => void;
  let rejectInitialClaim!: (error: unknown) => void;
  let initialClaimSettled = false;

  const initialClaim = new Promise<void>((resolve, reject) => {
    resolveInitialClaim = resolve;
    rejectInitialClaim = reject;
  });

  const sessionRootRef = ref(
    database,
    DATABASE_PATHS_FOR_ACTIVE_USER_SESSIONS.activeUserSessionPresenceRoot(uid),
  );

  const nextSessionRef = push(sessionRootRef);
  const sessionId = nextSessionRef.key;

  if (!sessionId) {
    throw new Error("Failed to generate session ID.");
  }

  const connectedRef = ref(database, PRIMITIVE_RTDB_PATHS.CONNECTED);

  const unsubscribe = onValue(connectedRef, async (snapshot) => {
    if (stopped) {
      return;
    }

    if (snapshot.val() !== true) {
      // onDisconnectによってサーバー側のセッションは削除される
      presenceIsActive = false;
      return;
    }

    if (presenceIsActive || isClaiming) {
      return;
    }

    isClaiming = true;

    try {
      // 書き込む前に切断時削除を予約する
      const disconnectOperation = onDisconnect(nextSessionRef);
      await disconnectOperation.remove();

      await set(nextSessionRef, {
        [ACTIVE_USER_SESSION_KEYS.CONNECTED_AT]: serverTimestamp(),
      });

      await acquireActiveUserSessionWithRetry(sessionId);

      if (stopped) {
        await disconnectOperation.cancel();
        await remove(nextSessionRef);
        return;
      }

      presenceIsActive = true;

      if (!initialClaimSettled) {
        initialClaimSettled = true;
        resolveInitialClaim();
      }
    } catch (error) {
      await onDisconnect(nextSessionRef).cancel();

      try {
        await remove(nextSessionRef);
      } catch (cleanupError) {
        console.error("Failed to remove session presence.", cleanupError);
      }

      if (!initialClaimSettled) {
        initialClaimSettled = true;
        rejectInitialClaim(error);
        return;
      }

      // 一時切断後の再接続中に別タブが先にセッションを取得した場合
      options.onSessionLost?.();
    } finally {
      isClaiming = false;
    }
  });

  try {
    await initialClaim;
  } catch (error) {
    stopped = true;
    unsubscribe();
    throw error;
  }

  return async () => {
    if (stopped) {
      return;
    }

    stopped = true;
    unsubscribe();

    const disconnectOperation = onDisconnect(nextSessionRef);

    await disconnectOperation.cancel();
    await remove(nextSessionRef);

    presenceIsActive = false;
  };
}
