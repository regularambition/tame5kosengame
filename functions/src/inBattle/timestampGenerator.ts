import {DURATION_IN_MILLI_SEC} from "@tame5kosengame/shared";

export function findHandSubmissionDeadline(thinkingTimeInSec: number) {
  return (
    Date.now() + thinkingTimeInSec * 1000 + DURATION_IN_MILLI_SEC.HAND_SUBMISSION_DEADLINE_BUFFER
  );
}
