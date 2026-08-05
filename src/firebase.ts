import {PRIMITIVE_RTDB_PATHS} from "@tame5kosengame/shared";
import {initializeApp} from "firebase/app";
import {getAuth} from "firebase/auth";
import {getDatabase, goOffline, goOnline, onValue, ref} from "firebase/database";
import {getFunctions} from "firebase/functions";
import {httpsCallable} from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);

/**
 * Cloud Functionsで動く処理の集まり
 */
const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION;
export const functions = getFunctions(app, functionsRegion);
export function getCallableFunction<ARG, RET>(functionName: string) {
  return httpsCallable<ARG, RET>(functions, functionName);
}

// 切断された時の処理確認用（本番では使わない）
if (import.meta.env.DEV) {
  onValue(ref(database, PRIMITIVE_RTDB_PATHS.CONNECTED), (snapshot) => {
    console.log(`[RTDB test] connected = ${snapshot.val() === true}`);
  });

  Object.assign(window, {
    disconnectRealtimeDatabase: () => {
      console.log("[RTDB test] Going offline...");
      goOffline(database);
    },

    reconnectRealtimeDatabase: () => {
      console.log("[RTDB test] Going online...");
      goOnline(database);
    },
  });
}
