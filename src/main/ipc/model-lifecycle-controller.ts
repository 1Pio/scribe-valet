import path from "node:path";
import { IPC_CHANNELS } from "../../shared/protocol/ipc-envelope";
import type { ModelLifecycleSnapshot } from "../../shared/types/model-lifecycle";

export type ModelLifecycleCopyReportResult = {
  ok: boolean;
  report: string;
};

export const MODEL_LIFECYCLE_CONTROLLER_CHANNELS = {
  GET_STATE: IPC_CHANNELS.MODEL_LIFECYCLE_GET_STATE,
  STATUS_CHANGED: IPC_CHANNELS.MODEL_LIFECYCLE_STATUS_CHANGED,
  START_CHECK: IPC_CHANNELS.MODEL_LIFECYCLE_START_CHECK,
  RETRY: IPC_CHANNELS.MODEL_LIFECYCLE_RETRY,
  CHANGE_PATH: IPC_CHANNELS.MODEL_LIFECYCLE_CHANGE_PATH,
  COPY_REPORT: IPC_CHANNELS.MODEL_LIFECYCLE_COPY_REPORT,
  CONFIRM_DOWNLOAD: IPC_CHANNELS.MODEL_LIFECYCLE_CONFIRM_DOWNLOAD
} as const;

type ModelLifecycleServiceLike = {
  getSnapshot: () => ModelLifecycleSnapshot;
  onSnapshot: (listener: (snapshot: ModelLifecycleSnapshot) => void) => () => void;
  startCheck: () => Promise<ModelLifecycleSnapshot>;
  retry: () => Promise<ModelLifecycleSnapshot>;
  changePath: (customRoot: string) => Promise<ModelLifecycleSnapshot>;
  copyDiagnostics: () => string;
  confirmDownload: () => Promise<ModelLifecycleSnapshot>;
};

type IpcMainLike = {
  handle: (
    channel: string,
    handler: (_event: unknown, ...args: unknown[]) => unknown | Promise<unknown>
  ) => void;
  removeHandler?: (channel: string) => void;
};

type RendererBroadcastTarget = {
  send: (channel: string, payload: ModelLifecycleSnapshot) => void;
  isDestroyed?: () => boolean;
};

export function registerModelLifecycleController(options: {
  ipcMain: IpcMainLike;
  service: ModelLifecycleServiceLike;
  target: RendererBroadcastTarget;
}): () => void {
  const { ipcMain, service, target } = options;

  ipcMain.handle(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.GET_STATE, () => {
    return service.getSnapshot();
  });

  ipcMain.handle(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.START_CHECK, async () => {
    return service.startCheck();
  });

  ipcMain.handle(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.RETRY, async () => {
    return service.retry();
  });

  ipcMain.handle(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CHANGE_PATH, async (_event, input) => {
    return service.changePath(parseCustomRoot(input));
  });

  ipcMain.handle(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.COPY_REPORT, async () => {
    const report = service.copyDiagnostics();
    return {
      ok: true,
      report
    } satisfies ModelLifecycleCopyReportResult;
  });

  ipcMain.handle(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CONFIRM_DOWNLOAD, async () => {
    return service.confirmDownload();
  });

  const unsubscribe = service.onSnapshot((snapshot) => {
    if (target.isDestroyed?.()) {
      return;
    }

    try {
      target.send(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.STATUS_CHANGED, snapshot);
    } catch {
      return;
    }
  });

  return () => {
    unsubscribe();
    ipcMain.removeHandler?.(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.GET_STATE);
    ipcMain.removeHandler?.(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.START_CHECK);
    ipcMain.removeHandler?.(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.RETRY);
    ipcMain.removeHandler?.(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CHANGE_PATH);
    ipcMain.removeHandler?.(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.COPY_REPORT);
    ipcMain.removeHandler?.(MODEL_LIFECYCLE_CONTROLLER_CHANNELS.CONFIRM_DOWNLOAD);
  };
}

function parseCustomRoot(input: unknown): string {
  if (
    !input ||
    typeof input !== "object" ||
    typeof (input as { customRoot?: unknown }).customRoot !== "string"
  ) {
    throw new Error("change-path requires payload { customRoot: string }.");
  }

  const trimmed = (input as { customRoot: string }).customRoot.trim();
  if (trimmed.length === 0) {
    throw new Error("change-path requires a non-empty customRoot.");
  }

  const normalized = path.normalize(trimmed).replace(/[\\/]+$/, "");
  if (path.basename(normalized).toLowerCase() === "models") {
    return path.dirname(normalized);
  }

  return normalized;
}
