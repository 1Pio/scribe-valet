import { ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import {
  type RuntimeTrustCopyResult,
  type RuntimeTrustSnapshot
} from "../shared/protocol/runtime-trust";

type RuntimeTrustIpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
};

export type RuntimeTrustBridge = {
  getStatus: () => Promise<RuntimeTrustSnapshot>;
  retry: () => Promise<RuntimeTrustSnapshot>;
  copyReport: () => Promise<RuntimeTrustCopyResult>;
};

export function createRuntimeTrustBridge(
  client: RuntimeTrustIpcRenderer = ipcRenderer
): RuntimeTrustBridge {
  return {
    async getStatus(): Promise<RuntimeTrustSnapshot> {
      return client.invoke(IPC_CHANNELS.RUNTIME_TRUST_GET) as Promise<RuntimeTrustSnapshot>;
    },
    async retry(): Promise<RuntimeTrustSnapshot> {
      return client.invoke(
        IPC_CHANNELS.RUNTIME_TRUST_RETRY
      ) as Promise<RuntimeTrustSnapshot>;
    },
    async copyReport(): Promise<RuntimeTrustCopyResult> {
      return client.invoke(
        IPC_CHANNELS.RUNTIME_TRUST_COPY_REPORT
      ) as Promise<RuntimeTrustCopyResult>;
    }
  };
}
