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
      return client.invoke(IPC_CHANNELS.RUNTIME_GET_STATUS) as Promise<RuntimeStatus>;
    },
    onStatusChanged(listener: (status: RuntimeStatus) => void): () => void {
      const ipcListener = (_event: unknown, payload: RuntimeStatus): void => {
        listener(payload);
      };

      client.on(IPC_CHANNELS.RUNTIME_STATUS_CHANGED, ipcListener);
      return () => {
        client.off(IPC_CHANNELS.RUNTIME_STATUS_CHANGED, ipcListener);
      };
    },
    async fixNow(): Promise<RuntimeStatus> {
      return client.invoke(IPC_CHANNELS.RUNTIME_FIX_NOW) as Promise<RuntimeStatus>;
    },
    async tryAgain(): Promise<RuntimeStatus> {
      return client.invoke(IPC_CHANNELS.RUNTIME_RETRY) as Promise<RuntimeStatus>;
    },
    async restartApp(): Promise<RuntimeStatus> {
      return client.invoke(IPC_CHANNELS.RUNTIME_RESTART_APP) as Promise<RuntimeStatus>;
    },
    async copyReport(): Promise<RuntimeCopyReportResult> {
      return client.invoke(IPC_CHANNELS.RUNTIME_COPY_REPORT) as Promise<RuntimeCopyReportResult>;
    }
  };
}
