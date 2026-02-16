import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RETRY_BACKOFF_MS, decideRetry, getRetryDelayMs } from "./retry-policy";
import { WorkerSupervisor } from "./worker-supervisor";

class FakeWorkerProcess extends EventEmitter {
  public kill(): void {}
}

describe("retry policy", () => {
  it("uses fixed short backoff delays", () => {
    expect(RETRY_BACKOFF_MS).toEqual([200, 800, 2000]);
    expect(getRetryDelayMs(1)).toBe(200);
    expect(getRetryDelayMs(2)).toBe(800);
    expect(getRetryDelayMs(3)).toBe(2000);
  });

  it("returns no retry decision after the third attempt", () => {
    expect(decideRetry(4)).toEqual({
      retry: false,
      attempt: 4,
      delayMs: null
    });
  });
});

describe("worker supervisor recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("retries with the configured delays and then exhausts", () => {
    const workers: FakeWorkerProcess[] = [];
    const supervisor = new WorkerSupervisor(() => {
      const process = new FakeWorkerProcess();
      workers.push(process);
      return process;
    });

    const states: string[] = [];
    supervisor.onStatus((status) => {
      states.push(`${status.state}:${status.attempt}:${status.nextRetryInMs}`);
    });

    supervisor.start();
    workers[0]?.emit("exit", 1);
    expect(supervisor.getStatus()).toMatchObject({
      state: "reconnecting",
      attempt: 1,
      nextRetryInMs: 200
    });

    vi.advanceTimersByTime(200);
    workers[1]?.emit("exit", 1);
    expect(supervisor.getStatus()).toMatchObject({
      state: "reconnecting",
      attempt: 2,
      nextRetryInMs: 800
    });

    vi.advanceTimersByTime(800);
    workers[2]?.emit("exit", 1);
    expect(supervisor.getStatus()).toMatchObject({
      state: "reconnecting",
      attempt: 3,
      nextRetryInMs: 2000
    });

    vi.advanceTimersByTime(2000);
    workers[3]?.emit("exit", 1);
    expect(supervisor.getStatus()).toMatchObject({
      state: "exhausted",
      attempt: 4,
      nextRetryInMs: null
    });

    expect(states).toEqual([
      "reconnecting:1:200",
      "reconnecting:2:800",
      "reconnecting:3:2000",
      "exhausted:4:null"
    ]);
  });
});
