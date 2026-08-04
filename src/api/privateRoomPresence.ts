import {onDisconnect, onValue, push, ref, remove, serverTimestamp, set} from "firebase/database";

import {auth, database} from "../firebase";
import {DATABASE_PATHS_FOR_ROOMS, PRIVATE_ROOM_PRESENCE_KEYS} from "@tame5kosengame/shared";

export function startPrivateRoomPresence(roomId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Authentication required.");
  }

  const connectedRef = ref(database, ".info/connected");
  let activeConnectionRef: ReturnType<typeof ref> | null = null;
  let stopped = false;

  const unsubscribe = onValue(connectedRef, async (snapshot) => {
    if (snapshot.val() !== true || stopped) {
      return;
    }

    const userPresenceRef = ref(
      database,
      DATABASE_PATHS_FOR_ROOMS.privateRoomPresenceOfUser(roomId, uid),
    );

    // push()でconnectionIdを生成する
    const connectionRef = push(userPresenceRef);
    activeConnectionRef = connectionRef;

    // 書き込みより先に切断時処理を予約する
    await onDisconnect(connectionRef).remove();

    if (stopped) {
      await onDisconnect(connectionRef).cancel();
      return;
    }

    await set(connectionRef, {
      [PRIVATE_ROOM_PRESENCE_KEYS.CONNECTED_AT]: serverTimestamp(),
    });
  });

  return async () => {
    if (stopped) {
      return;
    }

    stopped = true;
    unsubscribe();

    if (activeConnectionRef) {
      await onDisconnect(activeConnectionRef).cancel();
      await remove(activeConnectionRef);
      activeConnectionRef = null;
    }
  };
}
