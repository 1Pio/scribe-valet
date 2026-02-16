import { contextBridge, ipcRenderer } from "electron";
import {
  createHandshakeRequest,
  type HandshakeResponseEnvelope
} from "../shared/protocol/handshake";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import {
  createRuntimeTrustBridge,
  type RuntimeTrustBridge
} from "./runtime-trust-bridge";
import {
  createRuntimeStatusBridge,
  type RuntimeStatusBridge
} from "./runtime-status-bridge";

export type RuntimeBridge = {
  ping: () => Promise<{ ok: boolean }>;
  handshake: () => Promise<HandshakeResponseEnvelope>;
  runtimeStatus: RuntimeStatusBridge;
  runtimeTrust: RuntimeTrustBridge;
};

const runtimeBridge: RuntimeBridge = Object.freeze({
  ping: () => ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_PING),
  handshake: () =>
    ipcRenderer.invoke(
      IPC_CHANNELS.HANDSHAKE_INIT,
      createHandshakeRequest(
        {
          appVersion: "0.1.0",
          rendererVersion: "0.1.0",
          capabilities: ["runtime:ping"]
        },
        `handshake-${Date.now()}`
      )
  ),
  runtimeStatus: createRuntimeStatusBridge(),
  runtimeTrust: createRuntimeTrustBridge()
});

contextBridge.exposeInMainWorld("scribeValet", runtimeBridge);
