import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import { createRuntimeStatusBridge } from "./runtime-status-bridge";

describe("runtime status bridge", () => {
  const validStatus = {
    state: "idle",
    updatedAtMs: 100,
    delayedThresholdMs: 3000,
    actionThresholdMs: 9000,
    recovery: {
      attempt: 0,
      maxAttempts: 3,
      nextRetryInMs: null,
      startedAtMs: null,
      elapsedMs: 0
    },
    mismatch: null
  };

  it("invokes runtime status and action channels", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(validStatus)
      .mockResolvedValueOnce({ ...validStatus, state: "reconnecting" })
      .mockResolvedValueOnce({ ...validStatus, state: "reconnecting" })
      .mockResolvedValueOnce({ ok: true, action: "relaunch-intent" })
      .mockResolvedValueOnce({ ok: true, report: "runtime report" });
    const bridge = createRuntimeStatusBridge({
      invoke,
      on: vi.fn(),
      off: vi.fn()
    });

    await bridge.getStatus();
    await bridge.fixNow();
    await bridge.tryAgain();
    await expect(bridge.restartApp()).resolves.toEqual({
      ok: true,
      action: "relaunch-intent"
    });
    await bridge.copyReport();

    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.RUNTIME_GET_STATUS);
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.RUNTIME_FIX_NOW);
    expect(invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.RUNTIME_RETRY);
    expect(invoke).toHaveBeenNthCalledWith(4, IPC_CHANNELS.RUNTIME_RESTART_APP);
    expect(invoke).toHaveBeenNthCalledWith(5, IPC_CHANNELS.RUNTIME_COPY_REPORT);
  });

  it("subscribes and unsubscribes from status channel", () => {
    const on = vi.fn();
    const off = vi.fn();
    const bridge = createRuntimeStatusBridge({
      invoke: vi.fn(),
      on,
      off
    });

    const listener = vi.fn();
    const unsubscribe = bridge.onStatusChanged(listener);

    expect(on).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledWith(
      IPC_CHANNELS.RUNTIME_STATUS_CHANGED,
      expect.any(Function)
    );

    const subscribedHandler = on.mock.calls[0]?.[1] as
      | ((event: unknown, payload: unknown) => void)
      | undefined;
    const delayedStatus = {
      ...validStatus,
      state: "delayed",
      recovery: {
        ...validStatus.recovery,
        attempt: 2,
        elapsedMs: 3200
      }
    };

    subscribedHandler?.({}, delayedStatus);
    expect(listener).toHaveBeenCalledWith(delayedStatus);

    unsubscribe();

    expect(off).toHaveBeenCalledTimes(1);
    expect(off).toHaveBeenCalledWith(
      IPC_CHANNELS.RUNTIME_STATUS_CHANGED,
      subscribedHandler
    );
  });

  it("ignores malformed status payloads from subscription", () => {
    const on = vi.fn();
    const bridge = createRuntimeStatusBridge({
      invoke: vi.fn(),
      on,
      off: vi.fn()
    });

    const listener = vi.fn();
    bridge.onStatusChanged(listener);

    const subscribedHandler = on.mock.calls[0]?.[1] as
      | ((event: unknown, payload: unknown) => void)
      | undefined;

    subscribedHandler?.({}, { state: "reconnecting" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("throws for malformed invoke payloads", async () => {
    const bridge = createRuntimeStatusBridge({
      invoke: vi.fn().mockResolvedValue({ state: "idle" }),
      on: vi.fn(),
      off: vi.fn()
    });

    await expect(bridge.getStatus()).rejects.toThrow("invalid runtime status payload");
  });

  it("throws for malformed restart-app payloads", async () => {
    const bridge = createRuntimeStatusBridge({
      invoke: vi.fn().mockResolvedValue({ ok: true }),
      on: vi.fn(),
      off: vi.fn()
    });

    await expect(bridge.restartApp()).rejects.toThrow("invalid runtime restart payload");
  });
});
