export const DELAYED_STATUS_THRESHOLD_MS = 3000;
export const ACTION_STATUS_THRESHOLD_MS = 9000;
export const MAX_AUTOMATIC_RECOVERY_ATTEMPTS = 3;

export type RuntimeLifecycleState =
  | "idle"
  | "reconnecting"
  | "delayed"
  | "mismatch"
  | "exhausted";

export type RuntimeMismatchContext = {
  reason: "protocol-mismatch" | "version-mismatch" | "invalid-handshake";
  expectedProtocolId: string;
  expectedProtocolVersion: number;
  expectedWorkerVersionRange: string;
  installedProtocolId: string;
  installedProtocolVersion: number;
  installedWorkerVersion: string;
};

export type RuntimeRecoveryContext = {
  attempt: number;
  maxAttempts: number;
  nextRetryInMs: number | null;
  startedAtMs: number | null;
  elapsedMs: number;
};

export type RuntimeStatus = {
  state: RuntimeLifecycleState;
  updatedAtMs: number;
  delayedThresholdMs: number;
  actionThresholdMs: number;
  recovery: RuntimeRecoveryContext;
  mismatch: RuntimeMismatchContext | null;
};

export function createIdleRuntimeStatus(atMs: number = Date.now()): RuntimeStatus {
  return {
    state: "idle",
    updatedAtMs: atMs,
    delayedThresholdMs: DELAYED_STATUS_THRESHOLD_MS,
    actionThresholdMs: ACTION_STATUS_THRESHOLD_MS,
    recovery: {
      attempt: 0,
      maxAttempts: MAX_AUTOMATIC_RECOVERY_ATTEMPTS,
      nextRetryInMs: null,
      startedAtMs: null,
      elapsedMs: 0
    },
    mismatch: null
  };
}
