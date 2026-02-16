import { contextBridge, ipcRenderer } from "electron";
import {
  createHandshakeRequest,
  type HandshakeResponseEnvelope
} from "../shared/protocol/handshake";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";

export type RuntimeBridge = {
  ping: () => Promise<{ ok: boolean }>;
  handshake: () => Promise<HandshakeResponseEnvelope>;
};

const runtimeBridge: RuntimeBridge = {
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
    )
};

contextBridge.exposeInMainWorld("scribeValet", runtimeBridge);
