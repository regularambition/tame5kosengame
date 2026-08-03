import type {TaskQueueOptions} from "firebase-functions/v2/tasks";

export const BACKEND_REGION = "asia-southeast1";

export const PHASE_TRANSITION_TASK_OPTIONS = {
  region: BACKEND_REGION,
  retryConfig: {
    maxAttempts: 5,
    minBackoffSeconds: 1,
    maxBackoffSeconds: 10,
    maxRetrySeconds: 120,
  },
  rateLimits: {
    maxConcurrentDispatches: 20,
  },
} satisfies TaskQueueOptions;

export const KICKING_TASK_OPTIONS = {
  region: BACKEND_REGION,
  retryConfig: {
    maxAttempts: 5,
    minBackoffSeconds: 1,
    maxBackoffSeconds: 10,
    maxRetrySeconds: 120,
  },
  rateLimits: {
    maxConcurrentDispatches: 20,
  },
} satisfies TaskQueueOptions;

export const PRIVATE_LOBBY_DISCONNECT_TASK_OPTIONS = {
  region: BACKEND_REGION,
  retryConfig: {
    maxAttempts: 5,
    minBackoffSeconds: 1,
    maxBackoffSeconds: 10,
    maxRetrySeconds: 120,
  },
  rateLimits: {
    maxConcurrentDispatches: 20,
  },
} satisfies TaskQueueOptions;
