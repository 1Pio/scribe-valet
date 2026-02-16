import { EventEmitter } from "node:events";
import path from "node:path";
import { utilityProcess } from "electron";
import { acceptHandshake, type HandshakeDiagnostics } from "./handshake-gate";
import { decideRetry } from "./retry-policy";
import {
  ACTION_STATUS_THRESHOLD_MS,
  DELAYED_STATUS_THRESHOLD_MS,
  MAX_AUTOMATIC_RECOVERY_ATTEMPTS,
  createIdleRuntimeStatus,
  type RuntimeMismatchContext,
  type RuntimeRecoveryContext,
  type RuntimeStatus
} from "../../shared/types/runtime-status";

export type WorkerLifecycleStatus = RuntimeStatus;

export type WorkerDispatchResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "not-ready" | "mismatch";
      diagnostics?: HandshakeDiagnostics;
    };

type WorkerProcessLike = Pick<
  EventEmitter,
  "on" | "off" | "once" | "emit"
> & {
  postMessage: (message: unknown) => void;
  kill?: () => void;
};

export type WorkerSpawner = () => WorkerProcessLike;

type TimerHandle = ReturnType<typeof setTimeout>;

export class WorkerSupervisor extends EventEmitter {
  private readonly spawnWorkerProcess: WorkerSpawner;
  private worker: WorkerProcessLike | null = null;
  private retryTimer: TimerHandle | null = null;
  private delayedStateTimer: TimerHandle | null = null;
  private reconnectAttempt = 0;
  private reconnectStartMs: number | null = null;
  private ready = false;
  private mismatchDiagnostics: HandshakeDiagnostics | null = null;
  private status: RuntimeStatus = createIdleRuntimeStatus();
  private stopped = true;

  public constructor(spawnWorkerProcess: WorkerSpawner = createWorkerSpawner()) {
    super();
    this.spawnWorkerProcess = spawnWorkerProcess;
  }

  public start(): void {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    this.ready = false;
    this.spawn();
  }

  public stop(): void {
    this.stopped = true;
    this.clearRetryTimer();
    this.clearDelayedTimer();

    this.worker?.kill?.();
    this.worker = null;
    this.ready = false;
    this.mismatchDiagnostics = null;
    this.reconnectAttempt = 0;
    this.reconnectStartMs = null;
    this.publishStatus(createIdleRuntimeStatus());
  }

  public getStatus(): RuntimeStatus {
    return this.status;
  }

  public onStatus(listener: (status: RuntimeStatus) => void): () => void {
    this.on("status", listener);
    return () => {
      this.off("status", listener);
    };
  }

  public dispatchWork(payload: unknown): WorkerDispatchResult {
    if (this.mismatchDiagnostics) {
      return {
        ok: false,
        reason: "mismatch",
        diagnostics: this.mismatchDiagnostics
      };
    }

    if (!this.ready || !this.worker) {
      return {
        ok: false,
        reason: "not-ready"
      };
    }

    this.worker.postMessage({
      kind: "work:dispatch",
      payload
    });

    return { ok: true };
  }

  private spawn(): void {
    if (this.stopped) {
      return;
    }

    this.worker = this.spawnWorkerProcess();
    this.ready = false;

    this.worker.on("message", (event: unknown) => {
      const message = readMessageData(event);
      if (message?.kind !== "handshake:hello") {
        return;
      }

      const result = acceptHandshake(message.payload);
      if (result.accepted) {
        this.clearRetryTimer();
        this.clearDelayedTimer();
        this.mismatchDiagnostics = null;
        this.ready = true;
        this.reconnectAttempt = 0;
        this.reconnectStartMs = null;
        this.publishStatus(createIdleRuntimeStatus());
        return;
      }

      this.ready = false;
      this.mismatchDiagnostics = result.diagnostics;
      this.publishStatus({
        state: "mismatch",
        updatedAtMs: Date.now(),
        delayedThresholdMs: DELAYED_STATUS_THRESHOLD_MS,
        actionThresholdMs: ACTION_STATUS_THRESHOLD_MS,
        recovery: this.createRecoveryContext(null),
        mismatch: asMismatchContext(result.reason, result.diagnostics)
      });
      this.worker?.kill?.();
    });

    this.worker.on("exit", () => {
      this.handleWorkerExit();
    });

    this.worker.postMessage({
      kind: "handshake:init",
      payload: {
        expectedProtocolId: "sv-ipc",
        expectedProtocolVersion: 1,
        expectedWorkerVersionRange: "^0.1.0"
      }
    });
  }

  private handleWorkerExit(): void {
    if (this.stopped) {
      return;
    }

    if (this.status.state === "mismatch") {
      return;
    }

    this.ready = false;
    this.reconnectAttempt += 1;

    if (this.reconnectStartMs === null) {
      this.reconnectStartMs = Date.now();
      this.scheduleDelayedStatusTransition();
    }

    const decision = decideRetry(this.reconnectAttempt);
    if (!decision.retry) {
      this.clearRetryTimer();
      this.publishStatus({
        state: "exhausted",
        updatedAtMs: Date.now(),
        delayedThresholdMs: DELAYED_STATUS_THRESHOLD_MS,
        actionThresholdMs: ACTION_STATUS_THRESHOLD_MS,
        recovery: this.createRecoveryContext(null),
        mismatch: null
      });
      return;
    }

    this.publishStatus({
      state: "reconnecting",
      updatedAtMs: Date.now(),
      delayedThresholdMs: DELAYED_STATUS_THRESHOLD_MS,
      actionThresholdMs: ACTION_STATUS_THRESHOLD_MS,
      recovery: this.createRecoveryContext(decision.delayMs),
      mismatch: null
    });

    this.retryTimer = setTimeout(() => {
      this.spawn();
    }, decision.delayMs);
  }

  private scheduleDelayedStatusTransition(): void {
    this.clearDelayedTimer();
    this.delayedStateTimer = setTimeout(() => {
      if (this.status.state !== "reconnecting") {
        return;
      }

      this.publishStatus({
        state: "delayed",
        updatedAtMs: Date.now(),
        delayedThresholdMs: DELAYED_STATUS_THRESHOLD_MS,
        actionThresholdMs: ACTION_STATUS_THRESHOLD_MS,
        recovery: this.createRecoveryContext(this.status.recovery.nextRetryInMs),
        mismatch: null
      });
    }, DELAYED_STATUS_THRESHOLD_MS);
  }

  private createRecoveryContext(nextRetryInMs: number | null): RuntimeRecoveryContext {
    const startedAtMs = this.reconnectStartMs;
    const elapsedMs = startedAtMs === null ? 0 : Date.now() - startedAtMs;

    return {
      attempt: this.reconnectAttempt,
      maxAttempts: MAX_AUTOMATIC_RECOVERY_ATTEMPTS,
      nextRetryInMs,
      startedAtMs,
      elapsedMs
    };
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private clearDelayedTimer(): void {
    if (this.delayedStateTimer) {
      clearTimeout(this.delayedStateTimer);
      this.delayedStateTimer = null;
    }
  }

  private publishStatus(status: RuntimeStatus): void {
    this.status = status;
    this.emit("status", status);
  }
}

function createWorkerSpawner(): WorkerSpawner {
  return () => {
    const workerEntry = path.join(__dirname, "..", "..", "worker", "index.js");
    const child = utilityProcess.fork(workerEntry, [], {
      serviceName: "scribe-valet-worker"
    });

    return child as unknown as WorkerProcessLike;
  };
}

type WorkerMessage = {
  kind: string;
  payload?: unknown;
};

function readMessageData(event: unknown): WorkerMessage | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const candidate = event as Record<string, unknown>;
  const possibleMessage =
    "data" in candidate && candidate.data && typeof candidate.data === "object"
      ? (candidate.data as Record<string, unknown>)
      : candidate;

  if (typeof possibleMessage.kind !== "string") {
    return null;
  }

  return {
    kind: possibleMessage.kind,
    payload: possibleMessage.payload
  };
}

function asMismatchContext(
  reason: "protocol-mismatch" | "version-mismatch" | "invalid-handshake",
  diagnostics: HandshakeDiagnostics
): RuntimeMismatchContext {
  return {
    reason,
    expectedProtocolId: diagnostics.expectedProtocolId,
    expectedProtocolVersion: diagnostics.expectedProtocolVersion,
    expectedWorkerVersionRange: diagnostics.expectedWorkerVersionRange,
    installedProtocolId: diagnostics.installedProtocolId,
    installedProtocolVersion: diagnostics.installedProtocolVersion,
    installedWorkerVersion: diagnostics.installedWorkerVersion
  };
}
