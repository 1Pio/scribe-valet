import { EventEmitter } from "node:events";
import path from "node:path";
import { utilityProcess, type UtilityProcess } from "electron";
import { decideRetry } from "./retry-policy";

export type WorkerLifecycleState = "idle" | "reconnecting" | "exhausted";

export type WorkerLifecycleStatus = {
  state: WorkerLifecycleState;
  attempt: number;
  nextRetryInMs: number | null;
  updatedAtMs: number;
};

export type WorkerSupervisorEvents = {
  status: [WorkerLifecycleStatus];
};

type WorkerProcessLike = Pick<
  EventEmitter,
  "on" | "off" | "once" | "emit"
> & {
  postMessage?: (message: unknown) => void;
  kill?: () => void;
};

export type WorkerSpawner = () => WorkerProcessLike;

type TimerHandle = ReturnType<typeof setTimeout>;

export class WorkerSupervisor extends EventEmitter {
  private readonly spawnWorkerProcess: WorkerSpawner;
  private worker: WorkerProcessLike | null = null;
  private retryTimer: TimerHandle | null = null;
  private reconnectAttempt = 0;
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

  private spawn(): void {
    if (this.stopped) {
      return;
    }

    this.worker = this.spawnWorkerProcess();
    this.worker.on("exit", () => {
      this.handleWorkerExit();
    });
  }

  private handleWorkerExit(): void {
    if (this.stopped) {
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

export function isUtilityProcess(value: unknown): value is UtilityProcess {
  return typeof value === "object" && value !== null;
}
