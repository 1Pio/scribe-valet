import { describe, expect, it, vi } from "vitest";
import type { ModelLifecycleSnapshot } from "../../shared/types/model-lifecycle";
import {
  MODEL_LIFECYCLE_CONTROLLER_CHANNELS,
  registerModelLifecycleController
} from "./model-lifecycle-controller";

describe("model lifecycle controller", () => {
  it("registers handlers for all lifecycle invoke channels", () => {
    const handlers = new Map<string, (_event: unknown, ...args: unknown[]) => unknown>();

    registerModelLifecycleController({
      ipcMain: {
        handle: (channel, handler) => {
          handlers.set(channel, handler);
        }
      },
      service: createServiceStub(),
      target: {
        send: vi.fn()
      }
    });

    expect(handlers.has(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.GET_STATE)).toBe(true);
    expect(handlers.has(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.START_CHECK)).toBe(true);
    expect(handlers.has(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.RETRY)).toBe(true);
    expect(handlers.has(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CHANGE_PATH)).toBe(true);
    expect(handlers.has(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.COPY_REPORT)).toBe(true);
    expect(handlers.has(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CONFIRM_DOWNLOAD)).toBe(true);
  });

  it("routes lifecycle actions to service methods", async () => {
    const handlers = new Map<string, (_event: unknown, ...args: unknown[]) => unknown>();
    const snapshot = createSnapshot();
    const service = createServiceStub({ snapshot });

    registerModelLifecycleController({
      ipcMain: {
        handle: (channel, handler) => {
          handlers.set(channel, handler);
        }
      },
      service,
      target: {
        send: vi.fn()
      }
    });

    expect(await handlers.get(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.GET_STATE)?.({})).toEqual(snapshot);
    expect(await handlers.get(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.START_CHECK)?.({})).toEqual(snapshot);
    expect(await handlers.get(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.RETRY)?.({})).toEqual(snapshot);
    expect(
      await handlers.get(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CHANGE_PATH)?.({}, { customRoot: " /models " })
    ).toEqual(snapshot);
    expect(await handlers.get(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.COPY_REPORT)?.({})).toEqual({
      ok: true,
      report: "diagnostics"
    });
    expect(await handlers.get(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CONFIRM_DOWNLOAD)?.({})).toEqual(
      snapshot
    );

    expect(service.getSnapshot).toHaveBeenCalledTimes(1);
    expect(service.startCheck).toHaveBeenCalledTimes(1);
    expect(service.retry).toHaveBeenCalledTimes(1);
    expect(service.changePath).toHaveBeenCalledWith("/models");
    expect(service.copyDiagnostics).toHaveBeenCalledTimes(1);
    expect(service.confirmDownload).toHaveBeenCalledTimes(1);
  });

  it("broadcasts snapshot updates to renderer subscribers", () => {
    let emitSnapshot: ((snapshot: ModelLifecycleSnapshot) => void) | undefined;
    const send = vi.fn();

    registerModelLifecycleController({
      ipcMain: {
        handle: vi.fn()
      },
      service: createServiceStub({
        onSnapshot: (listener) => {
          emitSnapshot = listener;
          return () => {
            emitSnapshot = undefined;
          };
        }
      }),
      target: {
        send
      }
    });

    const nextSnapshot = createSnapshot({ state: "checking", updatedAtMs: 2 });
    emitSnapshot?.(nextSnapshot);

    expect(send).toHaveBeenCalledWith(
      MODEL_LIFECYCLE_CONTROLLER_CHANNELS.STATUS_CHANGED,
      nextSnapshot
    );
  });

  it("throws for malformed change-path payload", async () => {
    const handlers = new Map<string, (_event: unknown, ...args: unknown[]) => unknown>();

    registerModelLifecycleController({
      ipcMain: {
        handle: (channel, handler) => {
          handlers.set(channel, handler);
        }
      },
      service: createServiceStub(),
      target: {
        send: vi.fn()
      }
    });

    await expect(
      handlers.get(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CHANGE_PATH)?.({}, { customRoot: "   " })
    ).rejects.toThrow("non-empty customRoot");
  });
});

function createServiceStub(overrides?: {
  snapshot?: ModelLifecycleSnapshot;
  onSnapshot?: (listener: (snapshot: ModelLifecycleSnapshot) => void) => () => void;
}) {
  const snapshot = overrides?.snapshot ?? createSnapshot();
  return {
    getSnapshot: vi.fn(() => snapshot),
    onSnapshot: overrides?.onSnapshot ?? vi.fn(() => () => {}),
    startCheck: vi.fn(async () => snapshot),
    retry: vi.fn(async () => snapshot),
    changePath: vi.fn(async (_customRoot: string) => snapshot),
    copyDiagnostics: vi.fn(() => "diagnostics"),
    confirmDownload: vi.fn(() => snapshot)
  };
}

function createSnapshot(overrides?: Partial<ModelLifecycleSnapshot>): ModelLifecycleSnapshot {
  return {
    state: "idle",
    updatedAtMs: 1,
    steps: [
      {
        id: "resolve-storage-path",
        label: "Resolve model storage path",
        detail: "detail",
        state: "ok"
      }
    ],
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
    },
    ...overrides
  };
}
