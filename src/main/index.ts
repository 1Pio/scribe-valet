import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { registerRuntimeTrustController } from "./ipc/runtime-trust-controller";
import {
  createHandshakeResponse,
  isHandshakeRequestPayload,
  type HandshakeRequestEnvelope
} from "../shared/protocol/handshake";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";

function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, "..", "preload", "index.js");

  return new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
}

async function bootstrap(): Promise<void> {
  ipcMain.handle(IPC_CHANNELS.RUNTIME_PING, async () => {
    return { ok: true };
  });

  ipcMain.handle(
    IPC_CHANNELS.HANDSHAKE_INIT,
    async (_event, envelope: HandshakeRequestEnvelope) => {
      const accepted = isHandshakeRequestPayload(envelope?.payload ?? null);
      return createHandshakeResponse(
        {
          accepted,
          reason: accepted ? "ok" : "protocol-mismatch",
          capabilities: accepted ? envelope.payload.capabilities : []
        },
        envelope?.requestId ?? "unknown"
      );
    }
  );

  registerRuntimeTrustController(ipcMain, {
    probeTrustEvidence: async () => {
      const appMetrics = app
        .getAppMetrics()
        .map((metric) => ({
          pid: metric.pid,
          type: metric.type,
          serviceName: metric.serviceName,
          name: metric.name
        }))
        .filter((metric) => typeof metric.pid === "number");

      return {
        guardrailCheckPassed: true,
        localPortFindings: [],
        appMetrics
      };
    }
  });

  const mainWindow = createMainWindow();
  mainWindow.loadURL("data:text/html,<div id=\"root\"></div>");
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
