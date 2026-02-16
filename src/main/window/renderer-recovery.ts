import type { RuntimeRestartAppResult } from "../ipc/runtime-controller";

export const DEFAULT_MAX_RENDERER_RECOVERY_RELOADS = 2;

type RendererRecoveryAction = "reload" | "relaunch" | "ignore";

export type RendererRecoverySignal =
  | "render-process-gone"
  | "unresponsive"
  | "did-fail-load";

export type RendererRecoveryDecision = {
  action: RendererRecoveryAction;
  reason: string;
};

type RendererRecoveryDecisionInput = {
  signal: RendererRecoverySignal;
  attempts: number;
  maxReloadAttempts: number;
  renderProcessReason?: string;
  isMainFrame?: boolean;
};

type RenderProcessGoneDetailsLike = {
  reason: string;
};

type WebContentsLike = {
  isDestroyed: () => boolean;
  reload: () => void;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  removeListener: (channel: string, listener: (...args: any[]) => void) => void;
};

export function decideRendererRecoveryAction(
  input: RendererRecoveryDecisionInput
): RendererRecoveryDecision {
  if (input.signal === "render-process-gone" && input.renderProcessReason === "clean-exit") {
    return {
      action: "ignore",
      reason: "clean-exit"
    };
  }

  if (input.signal === "did-fail-load" && input.isMainFrame === false) {
    return {
      action: "ignore",
      reason: "subframe-load-failure"
    };
  }

  if (input.attempts < input.maxReloadAttempts) {
    return {
      action: "reload",
      reason: "in-place-reload"
    };
  }

  return {
    action: "relaunch",
    reason: "repeated-renderer-failure"
  };
}

export function installRendererRecovery(options: {
  webContents: WebContentsLike;
  requestAppRelaunch: () => RuntimeRestartAppResult;
  maxReloadAttempts?: number;
}): () => void {
  const { webContents, requestAppRelaunch } = options;
  const maxReloadAttempts =
    options.maxReloadAttempts ?? DEFAULT_MAX_RENDERER_RECOVERY_RELOADS;
  let recoveryAttempts = 0;
  let relaunchRequested = false;

  const onDidFinishLoad = () => {
    recoveryAttempts = 0;
  };

  const onRenderProcessGone = (
    _event: unknown,
    details: RenderProcessGoneDetailsLike
  ) => {
    handleRecoverySignal("render-process-gone", {
      renderProcessReason: details.reason
    });
  };

  const onUnresponsive = () => {
    handleRecoverySignal("unresponsive");
  };

  const onDidFailLoad = (
    _event: unknown,
    _errorCode: number,
    _errorDescription: string,
    _validatedURL: string,
    isMainFrame: boolean
  ) => {
    handleRecoverySignal("did-fail-load", { isMainFrame });
  };

  const handleRecoverySignal = (
    signal: RendererRecoverySignal,
    options: {
      renderProcessReason?: string;
      isMainFrame?: boolean;
    } = {}
  ) => {
    if (webContents.isDestroyed() || relaunchRequested) {
      return;
    }

    const decision = decideRendererRecoveryAction({
      signal,
      attempts: recoveryAttempts,
      maxReloadAttempts,
      renderProcessReason: options.renderProcessReason,
      isMainFrame: options.isMainFrame
    });

    if (decision.action === "ignore") {
      return;
    }

    if (decision.action === "reload") {
      recoveryAttempts += 1;
      webContents.reload();
      return;
    }

    relaunchRequested = true;
    requestAppRelaunch();
  };

  webContents.on("did-finish-load", onDidFinishLoad);
  webContents.on("render-process-gone", onRenderProcessGone);
  webContents.on("unresponsive", onUnresponsive);
  webContents.on("did-fail-load", onDidFailLoad);

  return () => {
    webContents.removeListener("did-finish-load", onDidFinishLoad);
    webContents.removeListener("render-process-gone", onRenderProcessGone);
    webContents.removeListener("unresponsive", onUnresponsive);
    webContents.removeListener("did-fail-load", onDidFailLoad);
  };
}
