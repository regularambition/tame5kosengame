import {onCall, HttpsError} from "firebase-functions/v2/https";
import {ServerValue} from "firebase-admin/database";

import {db} from "../firebaseAdmin";

import {isValidUserName, USER_KEYS, DATABASE_PATHS_FOR_USERS} from "@tame5kosengame/shared";
import type {EnsureUserProfileResponse, UpdateUserNameRequest} from "@tame5kosengame/shared";

export const ensureUserProfile = onCall(async (request): Promise<EnsureUserProfileResponse> => {
  // Firebase Authenticationでログイン済みか確認
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const userRef = db.ref(DATABASE_PATHS_FOR_USERS.user(uid));
  const snapshot = await userRef.get();

  // 既に登録済み
  if (snapshot.exists()) {
    return {
      userName: snapshot.child(USER_KEYS.NAME).val(),
    };
  }

  // 未登録なら初期データ作成
  const initialUser = {
    [USER_KEYS.NAME]: "",
    [USER_KEYS.CREATED_AT]: ServerValue.TIMESTAMP,
  };

  await userRef.set(initialUser);
  return {
    userName: "",
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

  db.ref(DATABASE_PATHS_FOR_USERS.userName(uid)).set(name);
});
