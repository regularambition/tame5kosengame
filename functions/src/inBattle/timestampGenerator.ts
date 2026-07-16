import {DURATION_IN_MILLI_SEC} from "@tame5kosengame/shared";

export function findNextPhaseAt() {
  return (
    Date.now() + DURATION_IN_MILLI_SEC.INTERLUDE_DISPLAY + DURATION_IN_MILLI_SEC.INTERLUDE_BUFFER
  );
}

export function findHandSubmissionDeadline(thinkingTimeInSec: number) {
  return (
    Date.now() + thinkingTimeInSec * 1000 + DURATION_IN_MILLI_SEC.HAND_SUBMISSION_DEADLINE_BUFFER
  );
}
