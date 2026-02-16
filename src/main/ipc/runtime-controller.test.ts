import { describe, expect, it, vi } from "vitest";
import { registerRuntimeController, RUNTIME_CONTROLLER_CHANNELS } from "./runtime-controller";
import { createIdleRuntimeStatus, type RuntimeStatus } from "../../shared/types/runtime-status";

describe("runtime controller", () => {
  it("returns current runtime status through ipc handler", async () => {
    const handlers = new Map<string, (_event: unknown) => unknown | Promise<unknown>>();
    const currentStatus = {
      ...createIdleRuntimeStatus(100),
      updatedAtMs: 200
    };

    registerRuntimeController({
      ipcMain: {
        handle: (channel, handler) => {
          handlers.set(channel, handler);
        }
      },
      statusSource: {
        getStatus: () => currentStatus,
        onStatus: () => () => {}
      },
      target: {
        send: vi.fn()
      },
      actions: {
        fixNow: () => currentStatus,
        retry: () => currentStatus,
        restartApp: () => ({ ok: true, action: "relaunch-intent" }),
        copyReport: () => ({ ok: true, report: "status report" })
      }
    });

    const getStatus = handlers.get(RUNTIME_CONTROLLER_CHANNELS.GET_STATUS);
    expect(getStatus).toBeTypeOf("function");
    expect(await getStatus?.({})).toEqual(currentStatus);
  });

  it("broadcasts status updates to renderer channel", () => {
    const callbacks: {
      status?: (status: RuntimeStatus) => void;
    } = {};
    const send = vi.fn();

    registerRuntimeController({
      ipcMain: {
        handle: vi.fn()
      },
      statusSource: {
        getStatus: () => createIdleRuntimeStatus(),
        onStatus: (listener) => {
          callbacks.status = listener;
          return () => {
            callbacks.status = undefined;
          };
        }
      },
      target: {
        send
      },
      actions: {
        fixNow: () => createIdleRuntimeStatus(),
        retry: () => createIdleRuntimeStatus(),
        restartApp: () => ({ ok: true, action: "relaunch-intent" }),
        copyReport: () => ({ ok: true, report: "status report" })
      }
    });

    const nextStatus: RuntimeStatus = {
      ...createIdleRuntimeStatus(10),
      state: "reconnecting",
      recovery: {
        attempt: 2,
        maxAttempts: 3,
        nextRetryInMs: 800,
        startedAtMs: 1,
        elapsedMs: 401
      }
    };

    callbacks.status?.(nextStatus);
    expect(send).toHaveBeenCalledWith(
      RUNTIME_CONTROLLER_CHANNELS.STATUS_CHANGED,
      nextStatus
    );
  });

  it("registers runtime recovery action handlers", async () => {
    const handlers = new Map<string, (_event: unknown) => unknown | Promise<unknown>>();
    const fixNow = vi.fn(() => createIdleRuntimeStatus(11));
    const retry = vi.fn(() => createIdleRuntimeStatus(12));
    const restartApp = vi.fn(() => ({
      ok: true as const,
      action: "relaunch-intent" as const
    }));
    const copyReport = vi.fn(() => ({ ok: true, report: "runtime report" }));

    registerRuntimeController({
      ipcMain: {
        handle: (channel, handler) => {
          handlers.set(channel, handler);
        }
      },
      statusSource: {
        getStatus: () => createIdleRuntimeStatus(),
        onStatus: () => () => {}
      },
      target: {
        send: vi.fn()
      },
      actions: {
        fixNow,
        retry,
        restartApp,
        copyReport
      }
    });

    await handlers.get(RUNTIME_CONTROLLER_CHANNELS.FIX_NOW)?.({});
    await handlers.get(RUNTIME_CONTROLLER_CHANNELS.RETRY)?.({});
    const restartResult = await handlers.get(RUNTIME_CONTROLLER_CHANNELS.RESTART_APP)?.({});
    await handlers.get(RUNTIME_CONTROLLER_CHANNELS.COPY_REPORT)?.({});

    expect(fixNow).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(restartApp).toHaveBeenCalledTimes(1);
    expect(restartResult).toEqual({ ok: true, action: "relaunch-intent" });
    expect(copyReport).toHaveBeenCalledTimes(1);
  });

  it("keeps action handlers usable when renderer status send fails", async () => {
    const handlers = new Map<string, (_event: unknown) => unknown | Promise<unknown>>();
    let pushStatus: ((status: RuntimeStatus) => void) | undefined;
    const fixNow = vi.fn(() => createIdleRuntimeStatus(99));

    registerRuntimeController({
      ipcMain: {
        handle: (channel, handler) => {
          handlers.set(channel, handler);
        }
      },
      statusSource: {
        getStatus: () => createIdleRuntimeStatus(),
        onStatus: (listener) => {
          pushStatus = listener;
          return () => {
            pushStatus = undefined;
          };
        }
      },
      target: {
        send: vi.fn(() => {
          throw new Error("renderer unavailable");
        })
      },
      actions: {
        fixNow,
        retry: () => createIdleRuntimeStatus(),
        restartApp: () => ({ ok: true, action: "relaunch-intent" }),
        copyReport: () => ({ ok: true, report: "status report" })
      }
    });

    pushStatus?.(createIdleRuntimeStatus(50));
    await handlers.get(RUNTIME_CONTROLLER_CHANNELS.FIX_NOW)?.({});

    expect(fixNow).toHaveBeenCalledTimes(1);
  });
});
