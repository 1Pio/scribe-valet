import { ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import type { RuntimeStatus } from "../shared/types/runtime-status";

export type RuntimeCopyReportResult = {
  ok: boolean;
  report: string;
};

type RuntimeStatusIpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, listener: (event: unknown, payload: RuntimeStatus) => void) => void;
  off: (channel: string, listener: (event: unknown, payload: RuntimeStatus) => void) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRuntimeStatus(value: unknown): value is RuntimeStatus {
  if (!isRecord(value) || typeof value.state !== "string") {
    return false;
  }

  return (
    typeof value.updatedAtMs === "number" &&
    typeof value.delayedThresholdMs === "number" &&
    typeof value.actionThresholdMs === "number" &&
    isRecord(value.recovery)
  );
}

function isRuntimeCopyReportResult(value: unknown): value is RuntimeCopyReportResult {
  return isRecord(value) && typeof value.ok === "boolean" && typeof value.report === "string";
}

export type RuntimeStatusBridge = {
  getStatus: () => Promise<RuntimeStatus>;
  onStatusChanged: (listener: (status: RuntimeStatus) => void) => () => void;
  fixNow: () => Promise<RuntimeStatus>;
  tryAgain: () => Promise<RuntimeStatus>;
  restartApp: () => Promise<RuntimeStatus>;
  copyReport: () => Promise<RuntimeCopyReportResult>;
};

export function createRuntimeStatusBridge(
  client: RuntimeStatusIpcRenderer = ipcRenderer
): RuntimeStatusBridge {
  return {
    async getStatus(): Promise<RuntimeStatus> {
      const status = await client.invoke(IPC_CHANNELS.RUNTIME_GET_STATUS);
      if (!isRuntimeStatus(status)) {
        throw new Error("Received invalid runtime status payload from main process.");
      }

      return status;
    },
    onStatusChanged(listener: (status: RuntimeStatus) => void): () => void {
      const ipcListener = (_event: unknown, payload: unknown): void => {
        if (!isRuntimeStatus(payload)) {
          return;
        }

        listener(payload);
      };

      client.on(IPC_CHANNELS.RUNTIME_STATUS_CHANGED, ipcListener);
      return () => {
        client.off(IPC_CHANNELS.RUNTIME_STATUS_CHANGED, ipcListener);
      };
    },
    async fixNow(): Promise<RuntimeStatus> {
      const status = await client.invoke(IPC_CHANNELS.RUNTIME_FIX_NOW);
      if (!isRuntimeStatus(status)) {
        throw new Error("Received invalid runtime status payload from main process.");
      }

      return status;
    },
    async tryAgain(): Promise<RuntimeStatus> {
      const status = await client.invoke(IPC_CHANNELS.RUNTIME_RETRY);
      if (!isRuntimeStatus(status)) {
        throw new Error("Received invalid runtime status payload from main process.");
      }

      return status;
    },
    async restartApp(): Promise<RuntimeStatus> {
      const status = await client.invoke(IPC_CHANNELS.RUNTIME_RESTART_APP);
      if (!isRuntimeStatus(status)) {
        throw new Error("Received invalid runtime status payload from main process.");
      }

      return status;
    },
    async copyReport(): Promise<RuntimeCopyReportResult> {
      const result = await client.invoke(IPC_CHANNELS.RUNTIME_COPY_REPORT);
      if (!isRuntimeCopyReportResult(result)) {
        throw new Error("Received invalid runtime copy report payload from main process.");
      }

      return result;
    }
  };
}
