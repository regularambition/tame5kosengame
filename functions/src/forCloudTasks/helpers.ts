import {BACKEND_REGION, ALGORITHM_NAME, ENCODING} from "../config";
import {createHash} from "crypto";

export function buildTaskPath(taskName: string) {
  return `locations/${BACKEND_REGION}/functions/${taskName}`;
}

export function isTaskAlreadyAdded(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "functions/task-already-exists"
  );
}

function prefixJoin(prefix: string, items: (string | number)[] = []): string {
  if (items.length === 0) {
    return prefix;
  }

  return prefix + ":" + items.join(":");
}

export function makeTaskId(prefix: string, items: (string | number)[] = []): string {
  const s = prefixJoin(prefix, items);
  return createHash(ALGORITHM_NAME).update(s).digest(ENCODING);
}

// DB監視をトリガーとするCloud Tasks担当処理が失敗した場合における
// 再試行可能期間を2分間に限定する
const EVENT_RETRY_WINDOW_MS = 2 * 60 * 1000;
export function isRetryWindowExpired(eventTime: string): boolean {
  const eventOccurredAt = Date.parse(eventTime);

  if (!Number.isFinite(eventOccurredAt)) {
    return false;
  }

  return Date.now() - eventOccurredAt >= EVENT_RETRY_WINDOW_MS;
}
