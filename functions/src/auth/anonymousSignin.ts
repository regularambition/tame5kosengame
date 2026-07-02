import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {ServerValue} from "firebase-admin/database";

import {db} from "../realtimeDatabase/commonReference";

initializeApp();

export const fetchUserInfo = onCall(async (request) => {
  // Firebase Authenticationでログイン済みか確認
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const userRef = db.ref(`users/${uid}`);
  const snapshot = await userRef.get();

  // 既に登録済み
  if (snapshot.exists()) {
    return {
      exists: true,
      user: snapshot.val(),
    };
  }

  // 未登録なら初期データ作成
  const initialUser = {
    uid,
    name: "",
    createdAt: ServerValue.TIMESTAMP,
  };

  await userRef.set(initialUser);

  return {
    exists: false,
    user: initialUser,
  };
});

export const updateUserName = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const name = request.data.name;

  if (typeof name !== "string") {
    throw new HttpsError("invalid-argument", "Invalid name.");
  }

  db.ref(`users/${uid}/name`).set(name);
});
