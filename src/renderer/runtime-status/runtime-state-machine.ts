import type { RuntimeStatus } from "../../shared/types/runtime-status";

export type RuntimeBannerPhase =
  | "hidden"
  | "transient"
  | "delayed"
  | "action-required"
  | "exhausted";

export type RuntimeBannerViewModel = {
  phase: RuntimeBannerPhase;
  visible: boolean;
  title: string;
  summary: string | null;
  details: string | null;
  showTryAgain: boolean;
  showRestartApp: boolean;
  showDetails: boolean;
  prioritizeRestartApp: boolean;
};

export type RuntimeMismatchViewModel = {
  visible: boolean;
  summary: string;
  detailsTitle: string;
  expectedVersion: string;
  installedVersion: string;
  showRestartApp: boolean;
};

const HIDDEN_MODEL: RuntimeBannerViewModel = {
  phase: "hidden",
  visible: false,
  title: "",
  summary: null,
  details: null,
  showTryAgain: false,
  showRestartApp: false,
  showDetails: false,
  prioritizeRestartApp: false
};

export function mapRuntimeStatusToBannerModel(
  status: RuntimeStatus,
  options: { isVoiceActive: boolean }
): RuntimeBannerViewModel {
  if (!options.isVoiceActive || status.state === "idle" || status.state === "mismatch") {
    return HIDDEN_MODEL;
  }

  const elapsedMs = status.recovery.elapsedMs;
  const reachedActionThreshold = elapsedMs >= status.actionThresholdMs;
  const reachedDelayedThreshold = elapsedMs >= status.delayedThresholdMs;

  if (status.state === "exhausted") {
    return {
      phase: "exhausted",
      visible: true,
      title: "Voice is still unavailable.",
      summary: "Restart app to get voice back.",
      details:
        "Automatic restart attempts were used without restoring voice. Open details to review the latest status and version information.",
      showTryAgain: true,
      showRestartApp: true,
      showDetails: true,
      prioritizeRestartApp: true
    };
  }

  if (reachedActionThreshold) {
    return {
      phase: "action-required",
      visible: true,
      title: "Voice is still unavailable.",
      summary: "Try again or restart app.",
      details: null,
      showTryAgain: true,
      showRestartApp: true,
      showDetails: false,
      prioritizeRestartApp: false
    };
  }

  if (status.state === "delayed" || reachedDelayedThreshold) {
    return {
      phase: "delayed",
      visible: true,
      title:
        status.recovery.attempt <= 1
          ? "Still starting, almost there..."
          : "Taking longer than usual...",
      summary: null,
      details: null,
      showTryAgain: false,
      showRestartApp: false,
      showDetails: false,
      prioritizeRestartApp: false
    };
  }

  return {
    phase: "transient",
    visible: true,
    title: "Reconnecting...",
    summary: null,
    details: null,
    showTryAgain: false,
    showRestartApp: false,
    showDetails: false,
    prioritizeRestartApp: false
  };
}

export function mapRuntimeStatusToMismatchModel(
  status: RuntimeStatus
): RuntimeMismatchViewModel | null {
  if (status.state !== "mismatch" || status.mismatch === null) {
    return null;
  }

  const mismatch = status.mismatch;

  type MismatchReason = NonNullable<RuntimeStatus["mismatch"]>["reason"];

  const reasonToSummary: Record<MismatchReason, string> = {
    "version-mismatch": "Finishing an update so voice can start.",
    "protocol-mismatch": "Fixing a small setup mismatch before voice starts.",
    "invalid-handshake": "Refreshing voice setup and trying again."
  };

  const showRestartApp = mismatch.reason !== "invalid-handshake";

  return {
    visible: true,
    summary: reasonToSummary[mismatch.reason],
    detailsTitle: "Details",
    expectedVersion: `${mismatch.expectedProtocolId}/${mismatch.expectedProtocolVersion} (${mismatch.expectedWorkerVersionRange})`,
    installedVersion: `${mismatch.installedProtocolId}/${mismatch.installedProtocolVersion} (${mismatch.installedWorkerVersion})`,
    showRestartApp
  };
}
