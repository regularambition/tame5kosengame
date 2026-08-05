/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import { onRequest } from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
import "./config/globalOptions";

import {
  ensureUserProfile,
  updateUserName,
  acquireActiveUserSession,
  cleanupActiveUserSession,
} from "./auth";
import {
  createPrivateRoom,
  enterPrivateRoom,
  leavePrivateRoom,
  deletePrivateRoom,
  markAsReady,
  kickGuest,
  removeKickedGuestData,
  handlePrivateRoomPresenceWritten,
  handlePrivateLobbyDisconnect,
} from "./roomManaging";
import {
  submitHand,
  finishIntroPhase,
  finishResolvedPhase,
  goBackToPrivateLobby,
  resign,
} from "./inBattle";
import {
  enqueuePhaseTransitionTask,
  enqueueGoBackToLobbyTask,
  enqueueRemoveKickedGuestDataTask,
  enqueuePrivateLobbyDisconnectTask,
} from "./forCloudTasks";

export {
  // 匿名認証・排他セッション系
  ensureUserProfile,
  updateUserName,
  acquireActiveUserSession,
  cleanupActiveUserSession,

  // プライベートマッチ部屋関連
  createPrivateRoom,
  enterPrivateRoom,
  leavePrivateRoom,
  deletePrivateRoom,
  markAsReady,
  submitHand,
  finishIntroPhase,
  finishResolvedPhase,
  goBackToPrivateLobby,
  resign,
  kickGuest,
  removeKickedGuestData,
  handlePrivateRoomPresenceWritten,
  handlePrivateLobbyDisconnect,

  // DBイベントからCloud Tasksを登録するFunction
  enqueuePhaseTransitionTask,
  enqueueGoBackToLobbyTask,
  enqueueRemoveKickedGuestDataTask,
  enqueuePrivateLobbyDisconnectTask,
};
