import type { RuntimeStatus } from "../../shared/types/runtime-status";

export const RUNTIME_CONTROLLER_CHANNELS = {
  GET_STATUS: "runtime:get-status",
  STATUS_CHANGED: "runtime:status:changed"
} as const;

type RuntimeStatusSource = {
  getStatus: () => RuntimeStatus;
  onStatus: (listener: (status: RuntimeStatus) => void) => () => void;
};

type IpcMainLike = {
  handle: (
    channel: string,
    handler: (_event: unknown) => RuntimeStatus | Promise<RuntimeStatus>
  ) => void;
  removeHandler?: (channel: string) => void;
};

type RendererBroadcastTarget = {
  send: (channel: string, payload: RuntimeStatus) => void;
};

export function registerRuntimeController(options: {
  ipcMain: IpcMainLike;
  statusSource: RuntimeStatusSource;
  target: RendererBroadcastTarget;
}): () => void {
  const { ipcMain, statusSource, target } = options;

  ipcMain.handle(RUNTIME_CONTROLLER_CHANNELS.GET_STATUS, () => {
    return statusSource.getStatus();
  });

  const unsubscribe = statusSource.onStatus((status) => {
    target.send(RUNTIME_CONTROLLER_CHANNELS.STATUS_CHANGED, status);
  });

  return () => {
    unsubscribe();
    ipcMain.removeHandler?.(RUNTIME_CONTROLLER_CHANNELS.GET_STATUS);
  };
}
