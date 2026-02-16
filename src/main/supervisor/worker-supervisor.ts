import { EventEmitter } from "node:events";
import path from "node:path";
import { utilityProcess } from "electron";
import { acceptHandshake, type HandshakeDiagnostics } from "./handshake-gate";
import { decideRetry } from "./retry-policy";

export type WorkerLifecycleState =
  | "idle"
  | "reconnecting"
  | "mismatch"
  | "exhausted";

export type WorkerLifecycleStatus = {
  state: WorkerLifecycleState;
  attempt: number;
  nextRetryInMs: number | null;
  updatedAtMs: number;
  mismatch?: HandshakeDiagnostics;
};

export type WorkerDispatchResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "not-ready" | "mismatch";
      diagnostics?: HandshakeDiagnostics;
    };

type WorkerSupervisorEvents = {
  status: [status: WorkerLifecycleStatus];
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
  private reconnectAttempt = 0;
  private ready = false;
  private mismatchDiagnostics: HandshakeDiagnostics | null = null;
  private status: WorkerLifecycleStatus = {
    state: "idle",
    attempt: 0,
    nextRetryInMs: null,
    updatedAtMs: Date.now()
  };
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
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.worker?.kill?.();
    this.worker = null;
    this.ready = false;
    this.mismatchDiagnostics = null;
    this.reconnectAttempt = 0;
    this.publishStatus({
      state: "idle",
      attempt: 0,
      nextRetryInMs: null,
      updatedAtMs: Date.now()
    });
  }

  public getStatus(): WorkerLifecycleStatus {
    return this.status;
  }

  public onStatus(listener: (status: WorkerLifecycleStatus) => void): () => void {
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
        this.mismatchDiagnostics = null;
        this.ready = true;
        this.reconnectAttempt = 0;
        this.publishStatus({
          state: "idle",
          attempt: 0,
          nextRetryInMs: null,
          updatedAtMs: Date.now()
        });
        return;
      }

      this.ready = false;
      this.mismatchDiagnostics = result.diagnostics;
      this.publishStatus({
        state: "mismatch",
        attempt: this.reconnectAttempt,
        nextRetryInMs: null,
        updatedAtMs: Date.now(),
        mismatch: result.diagnostics
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

    this.reconnectAttempt += 1;
    const decision = decideRetry(this.reconnectAttempt);

    if (!decision.retry) {
      this.publishStatus({
        state: "exhausted",
        attempt: this.reconnectAttempt,
        nextRetryInMs: null,
        updatedAtMs: Date.now()
      });
      return;
    }

    this.publishStatus({
      state: "reconnecting",
      attempt: this.reconnectAttempt,
      nextRetryInMs: decision.delayMs,
      updatedAtMs: Date.now()
    });

    this.retryTimer = setTimeout(() => {
      this.spawn();
    }, decision.delayMs);
  }

  private publishStatus(status: WorkerLifecycleStatus): void {
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
