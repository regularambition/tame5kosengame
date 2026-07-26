import {onValue, ref} from "firebase/database";

import {database} from "../../firebase";

import {DATABASE_PATHS_FOR_ROOMS} from "@tame5kosengame/shared";

export function watchHandSubmissionDeadline(
  roomId: string,
  onChange: (deadline: number) => void,
  isPrivateMatch: boolean = false,
) {
  const handSubmissionDeadlineRef = ref(
    database,
    DATABASE_PATHS_FOR_ROOMS.handSubmissionDeadline(roomId, isPrivateMatch),
  );

  return onValue(handSubmissionDeadlineRef, (snapshot) => {
    if (typeof snapshot.val() === "number") {
      onChange(snapshot.val());
    }
  });
}
