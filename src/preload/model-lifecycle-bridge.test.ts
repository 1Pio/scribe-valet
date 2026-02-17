import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import { createModelLifecycleBridge } from "./model-lifecycle-bridge";

describe("model lifecycle bridge", () => {
  const validSnapshot = {
    state: "idle",
    updatedAtMs: 1,
    steps: [],
    banner: {
      thresholdMs: 3000,
      startedAtMs: 1,
      isVisible: false,
      escalatedAtMs: null
    },
    setupReason: null,
    modeAvailability: {
      assistant: {
        mode: "assistant",
        status: "blocked",
        summary: "blocked",
        blockedBy: ["stt", "llm", "tts"]
      },
      dictation: {
        mode: "dictation",
        status: "blocked",
        summary: "blocked",
        blockedBy: ["stt"]
      }
    },
    readyToast: {
      enabled: true,
      showOnHealthyStartup: false
    },
    downloadConfirmation: {
      required: true,
      confirmedAtMs: null
    },
    downloadProgress: [],
    artifacts: [],
    recoveryActions: [],
    diagnostics: {
      summary: "diag",
      generatedAtMs: 1,
      lines: []
    }
  };

  it("invokes model lifecycle channels", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(validSnapshot)
      .mockResolvedValueOnce(validSnapshot)
      .mockResolvedValueOnce(validSnapshot)
      .mockResolvedValueOnce(validSnapshot)
      .mockResolvedValueOnce({ ok: true, report: "diagnostics" })
      .mockResolvedValueOnce(validSnapshot);
    const bridge = createModelLifecycleBridge({
      invoke,
      on: vi.fn(),
      off: vi.fn()
    });

    await bridge.getState();
    await bridge.startCheck();
    await bridge.retry();
    await bridge.changePath("  /models  ");
    await bridge.copyReport();
    await bridge.confirmDownload();

    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.MODEL_LIFECYCLE_GET_STATE);
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.MODEL_LIFECYCLE_START_CHECK);
    expect(invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.MODEL_LIFECYCLE_RETRY);
    expect(invoke).toHaveBeenNthCalledWith(4, IPC_CHANNELS.MODEL_LIFECYCLE_CHANGE_PATH, {
      customRoot: "/models"
    });
    expect(invoke).toHaveBeenNthCalledWith(5, IPC_CHANNELS.MODEL_LIFECYCLE_COPY_REPORT);
    expect(invoke).toHaveBeenNthCalledWith(6, IPC_CHANNELS.MODEL_LIFECYCLE_CONFIRM_DOWNLOAD);
  });

  it("subscribes and unsubscribes status listeners", () => {
    const on = vi.fn();
    const off = vi.fn();
    const bridge = createModelLifecycleBridge({ invoke: vi.fn(), on, off });

    const listener = vi.fn();
    const unsubscribe = bridge.onStatusChanged(listener);

    expect(on).toHaveBeenCalledWith(
      IPC_CHANNELS.MODEL_LIFECYCLE_STATUS_CHANGED,
      expect.any(Function)
    );

    const subscribed = on.mock.calls[0]?.[1] as
      | ((event: unknown, payload: unknown) => void)
      | undefined;
    subscribed?.({}, validSnapshot);
    expect(listener).toHaveBeenCalledWith(validSnapshot);

    unsubscribe();
    expect(off).toHaveBeenCalledWith(IPC_CHANNELS.MODEL_LIFECYCLE_STATUS_CHANGED, subscribed);
  });

  it("ignores malformed subscription payloads", () => {
    const on = vi.fn();
    const bridge = createModelLifecycleBridge({
      invoke: vi.fn(),
      on,
      off: vi.fn()
    });

    const listener = vi.fn();
    bridge.onStatusChanged(listener);

    const subscribed = on.mock.calls[0]?.[1] as
      | ((event: unknown, payload: unknown) => void)
      | undefined;
    subscribed?.({}, { state: "idle" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads and invalid path input", async () => {
    const bridge = createModelLifecycleBridge({
      invoke: vi.fn().mockResolvedValue({ state: "idle" }),
      on: vi.fn(),
      off: vi.fn()
    });

    await expect(bridge.getState()).rejects.toThrow("invalid model lifecycle payload");
    await expect(bridge.changePath("   ")).rejects.toThrow("non-empty custom root path");
  });
});
