import {FUNCTIONS_REGION} from "../config";

export function buildTaskPath(taskName: string) {
  return `locations/${FUNCTIONS_REGION}/functions/${taskName}`;
}

export function isTaskAlreadyAdded(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "functions/task-already-exists"
  );
}
