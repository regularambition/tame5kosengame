import {onCall, HttpsError} from "firebase-functions/v2/https";
import {ServerValue} from "firebase-admin/database";

import {db} from "../firebaseAdmin";

import {isValidUserName} from "@tame5kosengame/shared";
import type {EnsureUserProfileResponse, UpdateUserNameRequest} from "@tame5kosengame/shared";

export const ensureUserProfile = onCall(async (request): Promise<EnsureUserProfileResponse> => {
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
      alreadyRegistered: true,
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
    alreadyRegistered: false,
  };
});

export const updateUserName = onCall<UpdateUserNameRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const {name} = request.data;

  if (typeof name !== "string" || !isValidUserName(name)) {
    throw new HttpsError("invalid-argument", "Invalid name.");
  }

  db.ref(`users/${uid}/name`).set(name);
});
