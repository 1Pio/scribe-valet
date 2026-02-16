import { describe, expect, it } from "vitest";
import { createIdleRuntimeStatus, type RuntimeStatus } from "../../shared/types/runtime-status";
import {
  mapRuntimeStatusToBannerModel,
  mapRuntimeStatusToMismatchModel
} from "./runtime-state-machine";

function buildStatus(overrides: Partial<RuntimeStatus>): RuntimeStatus {
  return {
    ...createIdleRuntimeStatus(100),
    ...overrides,
    recovery: {
      ...createIdleRuntimeStatus(100).recovery,
      ...(overrides.recovery ?? {})
    }
  };
}

describe("runtime state machine", () => {
  it("hides banner when voice is not active", () => {
    const model = mapRuntimeStatusToBannerModel(
      buildStatus({ state: "reconnecting" }),
      { isVoiceActive: false }
    );

    expect(model.visible).toBe(false);
    expect(model.phase).toBe("hidden");
  });

  it("maps reconnecting state to transient reconnect copy", () => {
    const model = mapRuntimeStatusToBannerModel(
      buildStatus({
        state: "reconnecting",
        recovery: {
          attempt: 1,
          maxAttempts: 3,
          nextRetryInMs: 800,
          startedAtMs: 1,
          elapsedMs: 250
        }
      }),
      { isVoiceActive: true }
    );

    expect(model.phase).toBe("transient");
    expect(model.title).toBe("Reconnecting...");
    expect(model.showTryAgain).toBe(false);
  });

  it("shows gentle delayed update at 3000ms", () => {
    const model = mapRuntimeStatusToBannerModel(
      buildStatus({
        state: "delayed",
        recovery: {
          attempt: 1,
          maxAttempts: 3,
          nextRetryInMs: 2000,
          startedAtMs: 1,
          elapsedMs: 3000
        }
      }),
      { isVoiceActive: true }
    );

    expect(model.phase).toBe("delayed");
    expect(model.title).toContain("Still starting");
  });

  it("shows action buttons when still unavailable around 9s", () => {
    const model = mapRuntimeStatusToBannerModel(
      buildStatus({
        state: "delayed",
        recovery: {
          attempt: 3,
          maxAttempts: 3,
          nextRetryInMs: null,
          startedAtMs: 1,
          elapsedMs: 9000
        }
      }),
      { isVoiceActive: true }
    );

    expect(model.phase).toBe("action-required");
    expect(model.showTryAgain).toBe(true);
    expect(model.showRestartApp).toBe(true);
    expect(model.summary).toBe("Try again or restart app.");
    expect(model.prioritizeRestartApp).toBe(false);
  });

  it("emphasizes restart app and show details after retries are exhausted", () => {
    const model = mapRuntimeStatusToBannerModel(
      buildStatus({
        state: "exhausted",
        recovery: {
          attempt: 4,
          maxAttempts: 3,
          nextRetryInMs: null,
          startedAtMs: 1,
          elapsedMs: 9300
        }
      }),
      { isVoiceActive: true }
    );

    expect(model.phase).toBe("exhausted");
    expect(model.summary).toBe("Restart app to get voice back.");
    expect(model.showRestartApp).toBe(true);
    expect(model.showDetails).toBe(true);
    expect(model.prioritizeRestartApp).toBe(true);
  });

  it("maps version mismatch to human summary with restart fallback", () => {
    const model = mapRuntimeStatusToMismatchModel(
      buildStatus({
        state: "mismatch",
        mismatch: {
          reason: "version-mismatch",
          expectedProtocolId: "sv-ipc",
          expectedProtocolVersion: 1,
          expectedWorkerVersionRange: "^0.1.0",
          installedProtocolId: "sv-ipc",
          installedProtocolVersion: 1,
          installedWorkerVersion: "0.2.0"
        }
      })
    );

    expect(model?.summary).toBe("Finishing an update so voice can start.");
    expect(model?.showRestartApp).toBe(true);
  });

  it("hides restart fallback for invalid handshake mismatch", () => {
    const model = mapRuntimeStatusToMismatchModel(
      buildStatus({
        state: "mismatch",
        mismatch: {
          reason: "invalid-handshake",
          expectedProtocolId: "sv-ipc",
          expectedProtocolVersion: 1,
          expectedWorkerVersionRange: "^0.1.0",
          installedProtocolId: "sv-ipc",
          installedProtocolVersion: 1,
          installedWorkerVersion: "0.1.0"
        }
      })
    );

    expect(model?.summary).toBe("Refreshing voice setup and trying again.");
    expect(model?.showRestartApp).toBe(false);
  });
});
