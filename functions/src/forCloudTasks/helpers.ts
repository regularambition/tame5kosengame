import {FUNCTIONS_REGION} from "../config";

export function buildTaskPath(taskName: string) {
  return `locations/${FUNCTIONS_REGION}/functions/${taskName}`;
}
