import { describe, expect, it, vi } from "vitest";
import { registerRuntimeController, RUNTIME_CONTROLLER_CHANNELS } from "./runtime-controller";
import { createIdleRuntimeStatus, type RuntimeStatus } from "../../shared/types/runtime-status";

describe("runtime controller", () => {
  it("returns current runtime status through ipc handler", async () => {
    const handlers = new Map<string, (_event: unknown) => RuntimeStatus | Promise<RuntimeStatus>>();
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
});
