import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { installRendererRecovery } from "./renderer-recovery";

class FakeWebContents extends EventEmitter {
  public reload = vi.fn();

  public isDestroyed(): boolean {
    return false;
  }
}

describe("renderer recovery", () => {
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
});
