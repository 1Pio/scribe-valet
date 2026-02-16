import { contextBridge, ipcRenderer } from "electron";

const RUNTIME_PING_CHANNEL = "runtime:ping";

export type RuntimeBridge = {
  ping: () => Promise<{ ok: boolean }>;
};

const runtimeBridge: RuntimeBridge = {
  ping: () => ipcRenderer.invoke(RUNTIME_PING_CHANNEL)
};

contextBridge.exposeInMainWorld("scribeValet", runtimeBridge);
