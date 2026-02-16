import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";

const RUNTIME_PING_CHANNEL = "runtime:ping";

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
  ipcMain.handle(RUNTIME_PING_CHANNEL, async () => {
    return { ok: true };
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
