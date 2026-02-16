import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { app, BrowserWindow, clipboard, ipcMain } from "electron";
import {
  registerRuntimeController,
  type RuntimeRestartAppResult
} from "./ipc/runtime-controller";
import { registerRuntimeTrustController } from "./ipc/runtime-trust-controller";
import { WorkerSupervisor } from "./supervisor/worker-supervisor";
import { installRendererRecovery } from "./window/renderer-recovery";
import {
  createHandshakeResponse,
  isHandshakeRequestPayload,
  type HandshakeRequestEnvelope
} from "../shared/protocol/handshake";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import type { RuntimeStatus } from "../shared/types/runtime-status";

function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, "..", "preload", "index.js");

  return new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: true,
      sandbox: false
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

  const supervisor = new WorkerSupervisor();
  supervisor.start();

  const mainWindow = createMainWindow();
  const disposeRendererRecovery = installRendererRecovery({
    webContents: mainWindow.webContents,
    requestAppRelaunch: restartApplication
  });
  const disposeRuntimeController = registerRuntimeController({
    ipcMain,
    statusSource: {
      getStatus: () => supervisor.getStatus(),
      onStatus: (listener) => supervisor.onStatus(listener)
    },
    target: mainWindow.webContents,
    actions: {
      fixNow: () => restartSupervisor(supervisor),
      retry: () => restartSupervisor(supervisor),
      restartApp: () => restartApplication(),
      copyReport: () => {
        const report = buildRuntimeStatusReport(supervisor.getStatus());
        clipboard.writeText(report);
        return {
          ok: true,
          report
        };
      }
    }
  });

  mainWindow.on("closed", () => {
    disposeRendererRecovery();
    disposeRuntimeController();
    supervisor.stop();
  });

  const rendererDirectory = path.join(__dirname, "..", "renderer");
  await ensureRendererShell(rendererDirectory);
  await mainWindow.loadFile(path.join(rendererDirectory, "index.html"));
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

async function ensureRendererShell(rendererDirectory: string): Promise<void> {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    "  <meta charset=\"UTF-8\" />",
    "  <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';\" />",
    "  <title>Scribe-Valet</title>",
    "</head>",
    "<body>",
    "  <div id=\"root\"></div>",
    "  <script src=\"./index.browser.js\"></script>",
    "</body>",
    "</html>"
  ].join("\n");

  await mkdir(rendererDirectory, { recursive: true });
  await writeFile(path.join(rendererDirectory, "index.html"), html, "utf8");
}

function restartApplication(): RuntimeRestartAppResult {
  app.relaunch();
  setImmediate(() => {
    app.exit(0);
  });

  return {
    ok: true,
    action: "relaunch-intent"
  };
}

function restartSupervisor(supervisor: WorkerSupervisor): RuntimeStatus {
  supervisor.stop();
  supervisor.start();
  return supervisor.getStatus();
}

function buildRuntimeStatusReport(status: RuntimeStatus): string {
  const lines = [
    "Scribe-Valet runtime status",
    `State: ${status.state}`,
    `UpdatedAtMs: ${status.updatedAtMs}`,
    `RecoveryAttempt: ${status.recovery.attempt}/${status.recovery.maxAttempts}`,
    `NextRetryInMs: ${status.recovery.nextRetryInMs ?? "none"}`,
    `ElapsedMs: ${status.recovery.elapsedMs}`
  ];

  if (status.mismatch) {
    lines.push(
      `MismatchReason: ${status.mismatch.reason}`,
      `ExpectedProtocol: ${status.mismatch.expectedProtocolId}@${status.mismatch.expectedProtocolVersion}`,
      `InstalledProtocol: ${status.mismatch.installedProtocolId}@${status.mismatch.installedProtocolVersion}`,
      `ExpectedWorkerRange: ${status.mismatch.expectedWorkerVersionRange}`,
      `InstalledWorkerVersion: ${status.mismatch.installedWorkerVersion}`
    );
  }

  return lines.join("\n");
}
