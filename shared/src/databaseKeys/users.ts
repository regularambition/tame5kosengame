import {ROOT_KEYS} from "./root.js";

export const USER_KEYS = {
  CREATED_AT: "createdAt",
  NAME: "name",
} as const;

export const DATABASE_PATHS_FOR_USERS = {
  user: (uid: string) => `${ROOT_KEYS.USERS}/${uid}`,
  userName: (uid: string) => `${ROOT_KEYS.USERS}/${uid}/${USER_KEYS.NAME}`,
} as const;
