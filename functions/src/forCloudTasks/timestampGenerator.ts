import {DURATION_IN_MILLI_SEC} from "@tame5kosengame/shared";

export function findNextPhaseAt() {
  return Date.now() + DURATION_IN_MILLI_SEC.INTERLUDE_DISPLAY;
}

export function findHandSubmissionDeadline(thinkingTimeInSec: number) {
  return (
    Date.now() + thinkingTimeInSec * 1000 + DURATION_IN_MILLI_SEC.HAND_SUBMISSION_DEADLINE_BUFFER
  );
}

export function findBackToLobbyAt() {
  return Date.now() + DURATION_IN_MILLI_SEC.PRIVATE_RESULT_DISPLAY;
}

export function findReconnectDeadline() {
  return Date.now() + DURATION_IN_MILLI_SEC.RECONNECT_GRACE;
}

export function findActiveSessionReconnectDeadline() {
  return Date.now() + DURATION_IN_MILLI_SEC.ACTIVE_SESSION_RECONNECT_GRACE;
}
