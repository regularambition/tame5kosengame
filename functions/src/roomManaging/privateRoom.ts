import {onCall, HttpsError} from "firebase-functions/v2/https";
import {ServerValue} from "firebase-admin/database";
import {createHmac, randomInt} from "crypto";

import {db} from "../firebaseAdmin";

import {
  isValidMatchPoint,
  isValidThinkingTime,
  JOIN_CODE_RULES,
  isValidJoinCode,
  isValidPushId,
  ROOM_STATES,
  DATABASE_PATHS_FOR_ROOMS,
  GENERAL_ROOM_KEYS,
  PRIVATE_ROOM_JOIN_CODE_KEYS,
  PRIVATE_ROOM_KEYS,
  GAME_PHASES,
  INITIAL_VALUES_IN_BATTLE,
  CONNECTION_STATES,
} from "@tame5kosengame/shared";
import type {
  CreatePrivateRoomRequest,
  CreatePrivateRoomResponse,
  EnterPrivateRoomRequest,
  EnterPrivateRoomResponse,
  LeavePrivateRoomRequest,
  LeavePrivateRoomResponse,
  DeletePrivateRoomRequest,
  DeletePrivateRoomResponse,
  MarkAsReadyRequest,
  MarkAsReadyResponse,
} from "@tame5kosengame/shared";
import {findNextPhaseAt} from "../forCloudTasks";
import {ALGORITHM_NAME as ENCRYPTION_ALGORITHM_NAME} from "../config";

const ROOM_ID_SPACE_SIZE = 100_000_000;
const MAX_JOIN_CODE_GENERATION_ATTEMPTS = 10;

function generateJoinCode() {
  return randomInt(ROOM_ID_SPACE_SIZE).toString().padStart(JOIN_CODE_RULES.LENGTH, "0");
}

const JOIN_CODE_SECRET_KEY = "JOIN_CODE_SECRET";
function hashJoinCode(joinCode: string) {
  // Cloud Functionsの環境変数として設定された値を参照
  const secret = process.env[JOIN_CODE_SECRET_KEY];

  if (!secret) {
    throw new HttpsError("failed-precondition", `${JOIN_CODE_SECRET_KEY} is not configured.`);
  }

  return createHmac(ENCRYPTION_ALGORITHM_NAME, secret).update(joinCode).digest("hex");
}

async function reserveJoinCode(internalRoomId: string) {
  for (let i = 0; i < MAX_JOIN_CODE_GENERATION_ATTEMPTS; i++) {
    const joinCode = generateJoinCode();
    const joinCodeHash = hashJoinCode(joinCode);
    const joinCodeRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHash));

    // transaction処理を導入することにより「nullだから書き込める」
    // と判断して書き込みを行おうとした時に他のリクエストによる処理が割り込んできて
    // DBの状態が変わった場合に再試行が走る（DBの状態が再度評価される）
    // という構造を実現させられるため堅牢な処理を行うことが可能
    const result = await joinCodeRef.transaction((currentData) => {
      if (currentData != null) {
        // transaction内部でundefinedを返すと中止され
        // 別の参加コードをもとにした作成試行が始まる
        return undefined;
      }

      return {
        [PRIVATE_ROOM_JOIN_CODE_KEYS.ROOM_ID]: internalRoomId,
        [PRIVATE_ROOM_JOIN_CODE_KEYS.CREATED_AT]: ServerValue.TIMESTAMP,
      };
    });

    if (result.committed) {
      return {joinCode, joinCodeHash};
    }
  }

  throw new HttpsError("resource-exhausted", "Failed to generate unused join code.");
}

export const createPrivateRoom = onCall<CreatePrivateRoomRequest>(
  {secrets: [JOIN_CODE_SECRET_KEY]}, // process.env[JOIN_CODE_SECRET_KEY] による環境変数の参照を有効化
  async (request): Promise<CreatePrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const hostUid = request.auth.uid;
    const {matchPoint, thinkingTime, userName} = request.data;
    if (!isValidMatchPoint(matchPoint) || !isValidThinkingTime(thinkingTime)) {
      throw new HttpsError("invalid-argument", "Invalid match rules.");
    }

    // push実行直後時点ではIDが発行されるだけであって
    // データが作られるのは下のupdateが走って初めてである
    const internalRoomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoomsRoot()).push();
    const internalRoomId = internalRoomRef.key;

    if (!internalRoomId) {
      throw new HttpsError("internal", "Failed to generate room id.");
    }

    const {joinCode, joinCodeHash} = await reserveJoinCode(internalRoomId);

    try {
      await db.ref().update({
        [DATABASE_PATHS_FOR_ROOMS.privateRoom(internalRoomId)]: {
          [GENERAL_ROOM_KEYS.HOST]: {
            [GENERAL_ROOM_KEYS.UID]: hostUid,
            [GENERAL_ROOM_KEYS.NAME]: userName,
            [PRIVATE_ROOM_KEYS.READY]: false,
            [GENERAL_ROOM_KEYS.CONNECTION_STATE]: CONNECTION_STATES.RECONNECTING,
          },
          [GENERAL_ROOM_KEYS.CREATED_AT]: ServerValue.TIMESTAMP,
          [GENERAL_ROOM_KEYS.RULES]: {
            [GENERAL_ROOM_KEYS.MATCH_POINT]: parseInt(matchPoint),
            [GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC]: parseInt(thinkingTime),
          },
          [PRIVATE_ROOM_KEYS.JOIN_CODE_HASH]: joinCodeHash,
          [GENERAL_ROOM_KEYS.STATE]: ROOM_STATES.PREPARING,
        },
        [DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCodeRoomId(joinCodeHash)]: internalRoomId,
      });
    } catch (error) {
      // multi-location updateはatomicなので「どちらか一方への書き込みだけ成功」
      // という事態は発生せず「全て書き込み成功」または「全て書き込み失敗」の
      // どちらかしか起こり得ないためこのcatchブロックに到達した時点では確実に
      // privateRoomsおよびprivateRoomJoinCodesの両方とも書き込まれていない状態である
      // しかしこの行に到達している時点でハッシュ化された参加コードの予約は終わっているため
      // 後者については明示的に削除処理が必須となる
      await db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHash)).remove();
      throw error;
    }

    return {roomId: internalRoomId, joinCode: joinCode};
  },
);

export const enterPrivateRoom = onCall<EnterPrivateRoomRequest>(
  {secrets: [JOIN_CODE_SECRET_KEY]},
  async (request): Promise<EnterPrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {joinCode, isPlayer, userName} = request.data;
    if (!isValidJoinCode(joinCode)) {
      throw new HttpsError("invalid-argument", "Invalid join code.");
    }
    if (typeof isPlayer !== "boolean") {
      throw new HttpsError("invalid-argument", "Invalid request.");
    }

    const joinCodeHash = hashJoinCode(joinCode);
    const joinCodeSnapshot = await db
      .ref(DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHash))
      .get();
    if (!joinCodeSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const roomId = joinCodeSnapshot.child(PRIVATE_ROOM_JOIN_CODE_KEYS.ROOM_ID).val();
    if (typeof roomId !== "string") {
      throw new HttpsError("internal", "Invalid private room join code data.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const result = await roomRef.transaction((room) => {
      if (room == null) {
        return room;
      }

      if (room[GENERAL_ROOM_KEYS.STATE] === ROOM_STATES.CLOSED) {
        return room;
      }

      const host = room[GENERAL_ROOM_KEYS.HOST];
      if (
        host == null ||
        typeof host[GENERAL_ROOM_KEYS.UID] !== "string" ||
        typeof host[GENERAL_ROOM_KEYS.NAME] !== "string"
      ) {
        return room;
      }

      if (uid === host[GENERAL_ROOM_KEYS.UID]) {
        // ホストがゲストまたは観戦者として入ろうとしている場合は何も更新せず終了
        return room;
      }

      const rules = room[GENERAL_ROOM_KEYS.RULES];
      if (
        rules == null ||
        typeof rules[GENERAL_ROOM_KEYS.MATCH_POINT] !== "number" ||
        typeof rules[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC] !== "number"
      ) {
        return room;
      }

      const guest = room[GENERAL_ROOM_KEYS.GUEST];
      const spectators = room[PRIVATE_ROOM_KEYS.SPECTATORS];

      if (isPlayer) {
        // ゲストとして入る場合の処理
        if (guest != null || spectators?.[uid] === true) {
          // 既に埋まっている・既に観戦者として入っている場合は何も更新せず終了
          return room;
        }

        room[GENERAL_ROOM_KEYS.GUEST] = {
          [GENERAL_ROOM_KEYS.UID]: uid,
          [GENERAL_ROOM_KEYS.NAME]: userName,
          [PRIVATE_ROOM_KEYS.READY]: false,
          [GENERAL_ROOM_KEYS.CONNECTION_STATE]: CONNECTION_STATES.RECONNECTING,
        };
      } else {
        // 観戦者として入る場合の処理
        const guestUid = guest?.[GENERAL_ROOM_KEYS.UID];
        if (uid === guestUid) {
          // 既にゲストとして入っている場合は何も更新せず終了
          return room;
        }

        room[PRIVATE_ROOM_KEYS.SPECTATORS] ??= {};
        room[PRIVATE_ROOM_KEYS.SPECTATORS][uid] = true;
      }

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Cannot enter directed private room.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found after transaction.");
    }

    const finalRoom = result.snapshot.val();
    if (finalRoom[GENERAL_ROOM_KEYS.STATE] === ROOM_STATES.CLOSED) {
      throw new HttpsError("failed-precondition", "Cannot enter a closed room.");
    }

    const finalHost = finalRoom[GENERAL_ROOM_KEYS.HOST];
    if (
      finalHost == null ||
      typeof finalHost[GENERAL_ROOM_KEYS.UID] !== "string" ||
      typeof finalHost[GENERAL_ROOM_KEYS.NAME] !== "string"
    ) {
      throw new HttpsError("failed-precondition", "Host data is broken.");
    }
    if (uid === finalHost[GENERAL_ROOM_KEYS.UID]) {
      throw new HttpsError("failed-precondition", "Host cannot act as a guest or spectators.");
    }

    const finalRules = finalRoom[GENERAL_ROOM_KEYS.RULES];
    if (
      finalRules == null ||
      typeof finalRules[GENERAL_ROOM_KEYS.MATCH_POINT] !== "number" ||
      typeof finalRules[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC] !== "number"
    ) {
      throw new HttpsError("failed-precondition", "Rules data is broken.");
    }

    const finalGuest = finalRoom[GENERAL_ROOM_KEYS.GUEST];
    const finalSpectators = finalRoom[PRIVATE_ROOM_KEYS.SPECTATORS];
    if (isPlayer) {
      if (finalSpectators?.[uid] === true) {
        throw new HttpsError("failed-precondition", "Spectators cannot act as a guest.");
      }
      if (finalGuest == null) {
        throw new HttpsError("failed-precondition", "Guest registration failed.");
      }
      if (uid !== finalGuest[GENERAL_ROOM_KEYS.UID]) {
        throw new HttpsError("failed-precondition", "Private room is already occupied.");
      }
    } else {
      const finalGuestUid = finalGuest?.[GENERAL_ROOM_KEYS.UID];
      if (uid === finalGuestUid) {
        throw new HttpsError("failed-precondition", "Guest cannot act as spectators.");
      }

      if (finalSpectators?.[uid] !== true) {
        throw new HttpsError("failed-precondition", "Spectator registration failed.");
      }
    }

    return {
      roomId: roomId,
      hostName: finalHost[GENERAL_ROOM_KEYS.NAME],
      matchPoint: `${finalRules[GENERAL_ROOM_KEYS.MATCH_POINT]}`,
      thinkingTime: `${finalRules[GENERAL_ROOM_KEYS.THINKING_TIME_IN_SEC]}`,
    };
  },
);

export const leavePrivateRoom = onCall<LeavePrivateRoomRequest>(
  async (request): Promise<LeavePrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {isPlayer, roomId} = request.data;
    if (!isValidPushId(roomId)) {
      throw new HttpsError("invalid-argument", "Invalid room ID.");
    }
    if (typeof isPlayer !== "boolean") {
      throw new HttpsError("invalid-argument", "Invalid request.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const hostUid = roomSnapshot.child(GENERAL_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    if (typeof hostUid !== "string") {
      throw new HttpsError("internal", "Invalid private room data.");
    }
    if (hostUid === uid) {
      throw new HttpsError("failed-precondition", "Host cannot act as guest.");
    }

    if (isPlayer) {
      // transactionの初回処理ではローカルキャッシュを参照した結果
      // DBの実態とは異なるのにもかかわらず引数が強制的にnull扱いされる場合があるため
      // 真のDBと同じ状態を参照している状態において更新するために
      // 古い情報を参照している場合は何も更新せずすぐさま値をreturnすることで
      // 「このreturnで返している値により示される状態に更新します」という意思をDBに伝達し
      // 「お前の見ている情報は古いから最新の状態を見てやり直せ」という指示をDBから受け取るようにする
      let savedGuestUid = "";
      const result = await roomRef.transaction((currentRoom) => {
        savedGuestUid = "";
        if (currentRoom == null) {
          return currentRoom;
        }

        if (typeof currentRoom[PRIVATE_ROOM_KEYS.GUEST_IS_KICKED_AT] === "number") {
          // ゲストの追い出しが割り込んできた場合は何も更新せず終了
          return currentRoom;
        }

        const state = currentRoom[GENERAL_ROOM_KEYS.STATE];
        if (state !== ROOM_STATES.PREPARING) {
          return currentRoom;
        }

        const host = currentRoom[GENERAL_ROOM_KEYS.HOST];
        const guest = currentRoom[GENERAL_ROOM_KEYS.GUEST];
        if (host == null || guest == null) {
          return currentRoom;
        }

        savedGuestUid = guest[GENERAL_ROOM_KEYS.UID];
        if (guest[GENERAL_ROOM_KEYS.UID] !== uid) {
          return currentRoom;
        }

        host[PRIVATE_ROOM_KEYS.READY] = false;
        delete currentRoom[GENERAL_ROOM_KEYS.GUEST];
        return currentRoom;
      });
      if (!result.committed) {
        throw new HttpsError("failed-precondition", "Cannot leave this room.");
      }
      if (!result.snapshot.exists()) {
        throw new HttpsError("not-found", "Private room not found after transaction.");
      }

      const finalRoom = result.snapshot.val();
      const finalState = finalRoom[GENERAL_ROOM_KEYS.STATE];

      if (finalState !== ROOM_STATES.PREPARING) {
        throw new HttpsError("failed-precondition", "Room is not in preparing state.");
      }
      const finalHost = finalRoom[GENERAL_ROOM_KEYS.HOST];
      if (finalHost == null) {
        throw new HttpsError("failed-precondition", "Room is broken(lacking host).");
      }

      if (savedGuestUid !== uid) {
        throw new HttpsError("permission-denied", "You are not the guest of this room.");
      }

      const finalGuest = finalRoom[GENERAL_ROOM_KEYS.GUEST];
      if (finalGuest != null) {
        throw new HttpsError("failed-precondition", "failed to leave as a guest.");
      }
    } else if (
      roomSnapshot.child(GENERAL_ROOM_KEYS.GUEST).child(GENERAL_ROOM_KEYS.UID).val() === uid
    ) {
      throw new HttpsError("failed-precondition", "Guest cannot act as spectator.");
    } else {
      let matchedSpectatorUid = false;
      const result = await roomRef.transaction((currentRoom) => {
        matchedSpectatorUid = false;
        if (currentRoom == null) {
          return currentRoom;
        }

        const state = currentRoom[GENERAL_ROOM_KEYS.STATE];
        if (state === ROOM_STATES.CLOSED) {
          // 部屋の解散が割り込んできた場合は何も更新せず終了
          return currentRoom;
        }

        const spectators = currentRoom[PRIVATE_ROOM_KEYS.SPECTATORS];
        if (spectators == null) {
          return currentRoom;
        }

        if (spectators[uid] !== true) {
          return currentRoom;
        }

        matchedSpectatorUid = true;
        delete spectators[uid];
        return currentRoom;
      });
      if (!result.committed) {
        throw new HttpsError("failed-precondition", "Cannot leave this room.");
      }
      if (!result.snapshot.exists()) {
        throw new HttpsError("not-found", "Private room not found after transaction.");
      }
      if (!matchedSpectatorUid) {
        throw new HttpsError("permission-denied", "You are not a spectator of this room.");
      }

      const finalRoom = result.snapshot.val();
      const finalSpectators = finalRoom[PRIVATE_ROOM_KEYS.SPECTATORS];
      if (finalSpectators?.[uid] != null) {
        throw new HttpsError("failed-precondition", "failed to leave as a spectator.");
      }
    }

    return {
      hasSucceeded: true,
    };
  },
);

export const deletePrivateRoom = onCall<DeletePrivateRoomRequest>(
  async (request): Promise<DeletePrivateRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {roomId} = request.data;
    if (!isValidPushId(roomId)) {
      throw new HttpsError("invalid-argument", "Invalid room ID.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const hostUid = roomSnapshot.child(GENERAL_ROOM_KEYS.HOST).child(GENERAL_ROOM_KEYS.UID).val();
    if (hostUid !== uid) {
      throw new HttpsError("permission-denied", "Only host can delete this room.");
    }

    const joinCodeHash = roomSnapshot.child(PRIVATE_ROOM_KEYS.JOIN_CODE_HASH).val();
    const updates: Record<string, string | null> = {
      [DATABASE_PATHS_FOR_ROOMS.privateRoomState(roomId)]: ROOM_STATES.CLOSED,
    };

    if (typeof joinCodeHash === "string") {
      updates[DATABASE_PATHS_FOR_ROOMS.privateRoomJoinCode(joinCodeHash)] = null;
    }

    await db.ref().update(updates);

    return {
      hasSucceeded: true,
    };
  },
);

export const markAsReady = onCall<MarkAsReadyRequest>(
  async (request): Promise<MarkAsReadyResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const {roomId} = request.data;
    if (!isValidPushId(roomId)) {
      throw new HttpsError("invalid-argument", "Invalid room ID.");
    }

    const roomRef = db.ref(DATABASE_PATHS_FOR_ROOMS.privateRoom(roomId));
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found.");
    }

    const result = await roomRef.transaction((room) => {
      if (room == null) {
        return room;
      }

      if (typeof room[PRIVATE_ROOM_KEYS.GUEST_IS_KICKED_AT] === "number") {
        // ゲストの追い出しが割り込んできた場合は何も更新せず終了
        return room;
      }

      const host = room[GENERAL_ROOM_KEYS.HOST];
      const guest = room[GENERAL_ROOM_KEYS.GUEST];
      if (host == null || guest == null) {
        // ホスト及びゲストの両方がいる状態でないと更新させない
        // ゲストの退出が割り込んできた場合にも同様に対応させる
        return room;
      }

      if (uid !== host[GENERAL_ROOM_KEYS.UID] && uid !== guest[GENERAL_ROOM_KEYS.UID]) {
        // ホストでもゲストでもないユーザーによる呼び出しの場合は処理させない
        return room;
      }

      const bothConnected =
        host[GENERAL_ROOM_KEYS.CONNECTION_STATE] === CONNECTION_STATES.CONNECTED &&
        host[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE] == null &&
        guest[GENERAL_ROOM_KEYS.CONNECTION_STATE] === CONNECTION_STATES.CONNECTED &&
        guest[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE] == null;
      if (!bothConnected) {
        // ホスト・ゲストどちらか一方でも切断中ならば処理させない
        return room;
      }

      if (room[GENERAL_ROOM_KEYS.STATE] !== ROOM_STATES.PREPARING) {
        return room;
      }

      const currentPlayerIsReady =
        (uid === host[GENERAL_ROOM_KEYS.UID] && host?.[PRIVATE_ROOM_KEYS.READY] === true) ||
        (uid === guest[GENERAL_ROOM_KEYS.UID] && guest?.[PRIVATE_ROOM_KEYS.READY] === true);

      // 同じプレイヤーからの重複した準備完了はそのまま返す
      if (currentPlayerIsReady) {
        return room;
      }

      if (uid === host[GENERAL_ROOM_KEYS.UID]) {
        host[PRIVATE_ROOM_KEYS.READY] = true;
        host[GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;
        host[GENERAL_ROOM_KEYS.SCORE] = INITIAL_VALUES_IN_BATTLE.SCORE;
      } else {
        guest[PRIVATE_ROOM_KEYS.READY] = true;
        guest[GENERAL_ROOM_KEYS.MANA] = INITIAL_VALUES_IN_BATTLE.MANA;
        guest[GENERAL_ROOM_KEYS.SCORE] = INITIAL_VALUES_IN_BATTLE.SCORE;
      }

      const bothReady =
        host[PRIVATE_ROOM_KEYS.READY] === true && guest[PRIVATE_ROOM_KEYS.READY] === true;

      if (!bothReady) {
        return room;
      }

      room[GENERAL_ROOM_KEYS.STATE] = ROOM_STATES.PLAYING;

      room[GENERAL_ROOM_KEYS.GAME] ??= {};
      const nextGame = room[GENERAL_ROOM_KEYS.GAME];

      nextGame[GENERAL_ROOM_KEYS.PHASE] = GAME_PHASES.INTRO;
      nextGame[GENERAL_ROOM_KEYS.ROUND_NUMBER] = INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER;

      nextGame[GENERAL_ROOM_KEYS.RESOLVED_ROUND] ??= {};
      const resolvedRound = nextGame[GENERAL_ROOM_KEYS.RESOLVED_ROUND];
      resolvedRound[GENERAL_ROOM_KEYS.ROUND_NUMBER] = INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER - 1;
      resolvedRound[GENERAL_ROOM_KEYS.HOST] ??= {};
      resolvedRound[GENERAL_ROOM_KEYS.GUEST] ??= {};

      resolvedRound[GENERAL_ROOM_KEYS.HOST][GENERAL_ROOM_KEYS.MANA_GAIN] = 0;
      resolvedRound[GENERAL_ROOM_KEYS.HOST][GENERAL_ROOM_KEYS.SCORE_GAIN] = 0;

      resolvedRound[GENERAL_ROOM_KEYS.GUEST][GENERAL_ROOM_KEYS.MANA_GAIN] = 0;
      resolvedRound[GENERAL_ROOM_KEYS.GUEST][GENERAL_ROOM_KEYS.SCORE_GAIN] = 0;

      resolvedRound[GENERAL_ROOM_KEYS.RESOLVED_AT] = ServerValue.TIMESTAMP;
      resolvedRound[GENERAL_ROOM_KEYS.NEXT_PHASE_AT] = findNextPhaseAt();

      return room;
    });
    if (!result.committed) {
      throw new HttpsError("failed-precondition", "Cannot mark as ready.");
    }
    if (!result.snapshot.exists()) {
      throw new HttpsError("not-found", "Private room not found after transaction.");
    }

    const finalRoom = result.snapshot.val();

    if (typeof finalRoom[PRIVATE_ROOM_KEYS.GUEST_IS_KICKED_AT] === "number") {
      // ゲストの追い出しが割り込んできた場合は何も更新せず終了
      return {
        hasSucceeded: true,
      };
    }

    const finalHost = finalRoom[GENERAL_ROOM_KEYS.HOST];
    const finalGuest = finalRoom[GENERAL_ROOM_KEYS.GUEST];
    if (finalHost == null || finalGuest == null) {
      throw new HttpsError(
        "failed-precondition",
        "In order to mark as ready, both of host and guest must have non-null value.",
      );
    }

    const finalPlayer =
      finalHost[GENERAL_ROOM_KEYS.UID] === uid
        ? finalHost
        : finalGuest[GENERAL_ROOM_KEYS.UID] === uid
          ? finalGuest
          : null;
    if (finalPlayer == null) {
      throw new HttpsError("failed-precondition", "Invalid user.");
    }

    const finalBothConnected =
      finalHost[GENERAL_ROOM_KEYS.CONNECTION_STATE] === CONNECTION_STATES.CONNECTED &&
      finalHost[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE] == null &&
      finalGuest[GENERAL_ROOM_KEYS.CONNECTION_STATE] === CONNECTION_STATES.CONNECTED &&
      finalGuest[GENERAL_ROOM_KEYS.RECONNECT_DEADLINE] == null;
    if (!finalBothConnected) {
      throw new HttpsError("failed-precondition", "Both of host and guest must be connected.");
    }

    if (finalPlayer[PRIVATE_ROOM_KEYS.READY] !== true) {
      throw new HttpsError("failed-precondition", "Player was not marked as ready.");
    }

    const finalState = finalRoom[GENERAL_ROOM_KEYS.STATE];
    const bothReady =
      finalHost[PRIVATE_ROOM_KEYS.READY] === true && finalGuest[PRIVATE_ROOM_KEYS.READY] === true;

    if (!bothReady) {
      if (finalState !== ROOM_STATES.PREPARING) {
        throw new HttpsError("failed-precondition", "Room is not in preparing state.");
      }

      return {
        hasSucceeded: true,
      };
    }

    if (finalState !== ROOM_STATES.PLAYING) {
      throw new HttpsError(
        "internal",
        "Failed to change the state of room from preparing to playing.",
      );
    }

    const finalGame = finalRoom[GENERAL_ROOM_KEYS.GAME];
    if (finalGame == null) {
      throw new HttpsError("internal", "Failed to write the layer of game.");
    }
    if (finalGame[GENERAL_ROOM_KEYS.PHASE] !== GAME_PHASES.INTRO) {
      throw new HttpsError("internal", "Failed to write the phase of game as intro.");
    }
    if (finalGame[GENERAL_ROOM_KEYS.ROUND_NUMBER] !== INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER) {
      throw new HttpsError(
        "internal",
        `Failed to write the roundNumber of game as ${INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER}.`,
      );
    }

    const finalResolvedRound = finalGame[GENERAL_ROOM_KEYS.RESOLVED_ROUND];
    if (finalResolvedRound == null) {
      throw new HttpsError("internal", "Failed to write the layer of resolvedRound.");
    }
    if (
      finalResolvedRound[GENERAL_ROOM_KEYS.ROUND_NUMBER] !==
      INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER - 1
    ) {
      throw new HttpsError(
        "internal",
        `Failed to write the roundNumber of resolvedRound as ${INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER - 1}.`,
      );
    }
    const finalNextPhaseAt = finalResolvedRound[GENERAL_ROOM_KEYS.NEXT_PHASE_AT];
    if (typeof finalNextPhaseAt !== "number") {
      throw new HttpsError("internal", "Failed to write nextPhaseAt.");
    }

    return {
      hasSucceeded: true,
    };
  },
);
