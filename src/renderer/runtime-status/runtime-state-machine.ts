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
};

const HIDDEN_MODEL: RuntimeBannerViewModel = {
  phase: "hidden",
  visible: false,
  title: "",
  summary: null,
  details: null,
  showTryAgain: false,
  showRestartApp: false,
  showDetails: false
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
      summary: "Restart app to continue.",
      details:
        "Automatic recovery attempts were used. You can review technical details before trying again.",
      showTryAgain: true,
      showRestartApp: true,
      showDetails: true
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
      showDetails: false
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
      showDetails: false
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
    showDetails: false
  };
}
