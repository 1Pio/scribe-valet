import { ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import type { ModelLifecycleSnapshot } from "../shared/types/model-lifecycle";

export type ModelLifecycleCopyReportResult = {
  ok: boolean;
  report: string;
};

type ModelLifecycleIpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, listener: (event: unknown, payload: ModelLifecycleSnapshot) => void) => void;
  off: (channel: string, listener: (event: unknown, payload: ModelLifecycleSnapshot) => void) => void;
};

export type ModelLifecycleBridge = {
  getState: () => Promise<ModelLifecycleSnapshot>;
  onStatusChanged: (listener: (snapshot: ModelLifecycleSnapshot) => void) => () => void;
  startCheck: () => Promise<ModelLifecycleSnapshot>;
  retry: () => Promise<ModelLifecycleSnapshot>;
  changePath: (customRoot: string) => Promise<ModelLifecycleSnapshot>;
  copyReport: () => Promise<ModelLifecycleCopyReportResult>;
  confirmDownload: () => Promise<ModelLifecycleSnapshot>;
};

export function createModelLifecycleBridge(
  client: ModelLifecycleIpcRenderer = ipcRenderer
): ModelLifecycleBridge {
  return {
    async getState(): Promise<ModelLifecycleSnapshot> {
      const payload = await client.invoke(IPC_CHANNELS.MODEL_LIFECYCLE_GET_STATE);
      return parseSnapshot(payload);
    },
    onStatusChanged(listener: (snapshot: ModelLifecycleSnapshot) => void): () => void {
      const ipcListener = (_event: unknown, payload: unknown): void => {
        if (!isModelLifecycleSnapshot(payload)) {
          return;
        }

        listener(payload);
      };

      client.on(IPC_CHANNELS.MODEL_LIFECYCLE_STATUS_CHANGED, ipcListener);
      return () => {
        client.off(IPC_CHANNELS.MODEL_LIFECYCLE_STATUS_CHANGED, ipcListener);
      };
    },
    async startCheck(): Promise<ModelLifecycleSnapshot> {
      const payload = await client.invoke(IPC_CHANNELS.MODEL_LIFECYCLE_START_CHECK);
      return parseSnapshot(payload);
    },
    async retry(): Promise<ModelLifecycleSnapshot> {
      const payload = await client.invoke(IPC_CHANNELS.MODEL_LIFECYCLE_RETRY);
      return parseSnapshot(payload);
    },
    async changePath(customRoot: string): Promise<ModelLifecycleSnapshot> {
      const normalized = normalizeCustomRoot(customRoot);
      const payload = await client.invoke(IPC_CHANNELS.MODEL_LIFECYCLE_CHANGE_PATH, {
        customRoot: normalized
      });
      return parseSnapshot(payload);
    },
    async copyReport(): Promise<ModelLifecycleCopyReportResult> {
      const payload = await client.invoke(IPC_CHANNELS.MODEL_LIFECYCLE_COPY_REPORT);
      if (!isCopyReportResult(payload)) {
        throw new Error("Received invalid model lifecycle copy report payload from main process.");
      }

      return payload;
    },
    async confirmDownload(): Promise<ModelLifecycleSnapshot> {
      const payload = await client.invoke(IPC_CHANNELS.MODEL_LIFECYCLE_CONFIRM_DOWNLOAD);
      return parseSnapshot(payload);
    }
  };
}

function parseSnapshot(payload: unknown): ModelLifecycleSnapshot {
  if (!isModelLifecycleSnapshot(payload)) {
    throw new Error("Received invalid model lifecycle payload from main process.");
  }

  return payload;
}

function normalizeCustomRoot(customRoot: string): string {
  const normalized = customRoot.trim();
  if (normalized.length === 0) {
    throw new Error("Model lifecycle changePath requires a non-empty custom root path.");
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isModelLifecycleSnapshot(value: unknown): value is ModelLifecycleSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.state === "string" &&
    typeof value.updatedAtMs === "number" &&
    Array.isArray(value.steps) &&
    isRecord(value.banner) &&
    isRecord(value.modeAvailability) &&
    isRecord(value.readyToast) &&
    isRecord(value.downloadConfirmation) &&
    Array.isArray(value.downloadProgress) &&
    Array.isArray(value.artifacts) &&
    Array.isArray(value.recoveryActions) &&
    isRecord(value.diagnostics)
  );
}

function isCopyReportResult(value: unknown): value is ModelLifecycleCopyReportResult {
  return isRecord(value) && typeof value.ok === "boolean" && typeof value.report === "string";
}
