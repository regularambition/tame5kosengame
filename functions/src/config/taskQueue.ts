import type {TaskQueueOptions} from "firebase-functions/v2/tasks";

export const FUNCTIONS_REGION = "us-central1";

export const PHASE_TRANSITION_TASK_OPTIONS = {
  region: FUNCTIONS_REGION,
  retryConfig: {
    maxAttempts: 5,
    minBackoffSeconds: 1,
    maxBackoffSeconds: 10,
  },
  rateLimits: {
    maxConcurrentDispatches: 20,
  },
} satisfies TaskQueueOptions;
