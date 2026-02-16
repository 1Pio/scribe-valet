import type { RuntimeStatus } from "../../shared/types/runtime-status";
import { IPC_CHANNELS } from "../../shared/protocol/ipc-envelope";

export type RuntimeCopyReportResult = {
  ok: boolean;
  report: string;
};

export const RUNTIME_CONTROLLER_CHANNELS = {
  GET_STATUS: IPC_CHANNELS.RUNTIME_GET_STATUS,
  STATUS_CHANGED: IPC_CHANNELS.RUNTIME_STATUS_CHANGED,
  FIX_NOW: IPC_CHANNELS.RUNTIME_FIX_NOW,
  RETRY: IPC_CHANNELS.RUNTIME_RETRY,
  RESTART_APP: IPC_CHANNELS.RUNTIME_RESTART_APP,
  COPY_REPORT: IPC_CHANNELS.RUNTIME_COPY_REPORT
} as const;

type RuntimeStatusSource = {
  getStatus: () => RuntimeStatus;
  onStatus: (listener: (status: RuntimeStatus) => void) => () => void;
};

type IpcMainLike = {
  handle: (
    channel: string,
    handler: (_event: unknown) => unknown | Promise<unknown>
  ) => void;
  removeHandler?: (channel: string) => void;
};

type RendererBroadcastTarget = {
  send: (channel: string, payload: RuntimeStatus) => void;
};

type RuntimeActionHandlers = {
  fixNow: () => RuntimeStatus | Promise<RuntimeStatus>;
  retry: () => RuntimeStatus | Promise<RuntimeStatus>;
  restartApp: () => RuntimeStatus | Promise<RuntimeStatus>;
  copyReport: () => RuntimeCopyReportResult | Promise<RuntimeCopyReportResult>;
};

export function registerRuntimeController(options: {
  ipcMain: IpcMainLike;
  statusSource: RuntimeStatusSource;
  target: RendererBroadcastTarget;
  actions: RuntimeActionHandlers;
}): () => void {
  const { ipcMain, statusSource, target, actions } = options;

  ipcMain.handle(RUNTIME_CONTROLLER_CHANNELS.GET_STATUS, () => {
    return statusSource.getStatus();
  });

  ipcMain.handle(RUNTIME_CONTROLLER_CHANNELS.FIX_NOW, async () => {
    return actions.fixNow();
  });

  ipcMain.handle(RUNTIME_CONTROLLER_CHANNELS.RETRY, async () => {
    return actions.retry();
  });

  ipcMain.handle(RUNTIME_CONTROLLER_CHANNELS.RESTART_APP, async () => {
    return actions.restartApp();
  });

  ipcMain.handle(RUNTIME_CONTROLLER_CHANNELS.COPY_REPORT, async () => {
    return actions.copyReport();
  });

  const unsubscribe = statusSource.onStatus((status) => {
    target.send(RUNTIME_CONTROLLER_CHANNELS.STATUS_CHANGED, status);
  });

  return () => {
    unsubscribe();
    ipcMain.removeHandler?.(RUNTIME_CONTROLLER_CHANNELS.GET_STATUS);
    ipcMain.removeHandler?.(RUNTIME_CONTROLLER_CHANNELS.FIX_NOW);
    ipcMain.removeHandler?.(RUNTIME_CONTROLLER_CHANNELS.RETRY);
    ipcMain.removeHandler?.(RUNTIME_CONTROLLER_CHANNELS.RESTART_APP);
    ipcMain.removeHandler?.(RUNTIME_CONTROLLER_CHANNELS.COPY_REPORT);
  };
}
