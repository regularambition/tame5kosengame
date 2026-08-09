import {onDisconnect, onValue, push, ref, remove, serverTimestamp, set} from "firebase/database";

import {auth, database} from "../firebase";

import {
  DATABASE_PATHS_FOR_ROOMS,
  PRIMITIVE_RTDB_PATHS,
  PRIVATE_ROOM_PRESENCE_KEYS,
} from "@tame5kosengame/shared";

import type {PrivateRoomPresenceController} from "../types/PrivateRoomPresenceController";

export async function startPrivateRoomPresence(
  roomId: string,
): Promise<PrivateRoomPresenceController> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Authentication required.");
  }

  const userPresenceRef = ref(
    database,
    DATABASE_PATHS_FOR_ROOMS.privateRoomPresenceOfUser(roomId, uid),
  );

  // startPrivateRoomPresence呼び出しごとに一度だけ生成
  const connectionRef = push(userPresenceRef);
  const generatedConnectionId = connectionRef.key;

  if (!generatedConnectionId) {
    throw new Error("Failed to generate private room connection ID.");
  }

  const connectedRef = ref(database, PRIMITIVE_RTDB_PATHS.CONNECTED);

  let stopped = false;
  let presenceIsRegistered = false;
  let registrationIsRunning = false;

  const removePresence = async () => {
    const disconnectOperation = onDisconnect(connectionRef);

    await disconnectOperation.cancel();
    await remove(connectionRef);

    presenceIsRegistered = false;
  };

  const unsubscribe = onValue(connectedRef, async (snapshot) => {
    if (stopped) {
      return;
    }

    if (snapshot.val() !== true) {
      // サーバー側のonDisconnectにより削除される
      presenceIsRegistered = false;
      return;
    }

    if (presenceIsRegistered || registrationIsRunning) {
      return;
    }

    registrationIsRunning = true;

    const disconnectOperation = onDisconnect(connectionRef);

    try {
      // Presence書き込みより先に切断時削除を予約
      await disconnectOperation.remove();

      if (stopped) {
        await disconnectOperation.cancel();
        return;
      }

      await set(connectionRef, {
        [PRIVATE_ROOM_PRESENCE_KEYS.CONNECTED_AT]: serverTimestamp(),
      });

      // set中にstopが呼ばれた場合にも残存させない
      if (stopped) {
        await disconnectOperation.cancel();
        await remove(connectionRef);
        return;
      }

      presenceIsRegistered = true;
    } catch (error) {
      try {
        await disconnectOperation.cancel();
        await remove(connectionRef);
      } catch (cleanupError) {
        console.error("Failed to clean up private room presence.", cleanupError);
      }

      console.error("Failed to register private room presence.", error);
    } finally {
      registrationIsRunning = false;
    }
  });

  return {
    connectionId: generatedConnectionId,

    stop: async () => {
      if (stopped) {
        return;
      }

      stopped = true;
      unsubscribe();

      await removePresence();
    },
  } satisfies PrivateRoomPresenceController;
}
