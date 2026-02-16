import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import { createRuntimeStatusBridge } from "./runtime-status-bridge";

describe("runtime status bridge", () => {
  it("invokes runtime status and action channels", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ state: "idle" })
      .mockResolvedValueOnce({ state: "reconnecting" })
      .mockResolvedValueOnce({ state: "reconnecting" })
      .mockResolvedValueOnce({ state: "exhausted" })
      .mockResolvedValueOnce({ ok: true, report: "runtime report" });
    const bridge = createRuntimeStatusBridge({
      invoke,
      on: vi.fn(),
      off: vi.fn()
    });

    await bridge.getStatus();
    await bridge.fixNow();
    await bridge.tryAgain();
    await bridge.restartApp();
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
      | ((event: unknown, payload: { state: string }) => void)
      | undefined;
    subscribedHandler?.({}, { state: "delayed" });
    expect(listener).toHaveBeenCalledWith({ state: "delayed" });

    unsubscribe();

    expect(off).toHaveBeenCalledTimes(1);
    expect(off).toHaveBeenCalledWith(
      IPC_CHANNELS.RUNTIME_STATUS_CHANGED,
      subscribedHandler
    );
  });
});
