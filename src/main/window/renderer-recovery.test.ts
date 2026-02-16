import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  decideRendererRecoveryAction,
  installRendererRecovery
} from "./renderer-recovery";

class FakeWebContents extends EventEmitter {
  public reload = vi.fn();

  public isDestroyed(): boolean {
    return false;
  }
}

describe("renderer recovery", () => {
  it("decides in-place reload for recoverable renderer crash", () => {
    expect(
      decideRendererRecoveryAction({
        signal: "render-process-gone",
        renderProcessReason: "crashed",
        attempts: 0,
        maxReloadAttempts: 2
      })
    ).toEqual({
      action: "reload",
      reason: "in-place-reload"
    });
  });

  it("falls back to relaunch after repeated recovery failures", () => {
    expect(
      decideRendererRecoveryAction({
        signal: "unresponsive",
        attempts: 2,
        maxReloadAttempts: 2
      })
    ).toEqual({
      action: "relaunch",
      reason: "repeated-renderer-failure"
    });
  });

  it("ignores non-main-frame load failures", () => {
    expect(
      decideRendererRecoveryAction({
        signal: "did-fail-load",
        attempts: 0,
        maxReloadAttempts: 2,
        isMainFrame: false
      })
    ).toEqual({
      action: "ignore",
      reason: "subframe-load-failure"
    });
  });

  it("reloads renderer after unexpected render-process exit", () => {
    const webContents = new FakeWebContents();
    const requestAppRelaunch = vi.fn(() => ({ ok: true as const, action: "relaunch-intent" as const }));
    const dispose = installRendererRecovery({
      webContents,
      requestAppRelaunch
    });

    webContents.emit("render-process-gone", {}, { reason: "crashed" });

    expect(webContents.reload).toHaveBeenCalledTimes(1);
    expect(requestAppRelaunch).not.toHaveBeenCalled();
    dispose();
  });

  it("requests app relaunch once after repeated renderer failures", () => {
    const webContents = new FakeWebContents();
    const requestAppRelaunch = vi.fn(() => ({ ok: true as const, action: "relaunch-intent" as const }));
    const dispose = installRendererRecovery({
      webContents,
      requestAppRelaunch,
      maxReloadAttempts: 1
    });

    webContents.emit("render-process-gone", {}, { reason: "crashed" });
    webContents.emit("render-process-gone", {}, { reason: "killed" });
    webContents.emit("render-process-gone", {}, { reason: "oom" });

    expect(webContents.reload).toHaveBeenCalledTimes(1);
    expect(requestAppRelaunch).toHaveBeenCalledTimes(1);
    dispose();
  });
});
