export const MODEL_LIFECYCLE_BANNER_ESCALATION_MS = 3000;

export type ModelCapability = "stt" | "llm" | "tts";

export type LifecycleMode = "assistant" | "dictation";

export type LifecycleStepState =
  | "pending"
  | "running"
  | "ok"
  | "warning"
  | "error";

export type ModelLifecycleStep = {
  id: string;
  label: string;
  detail: string;
  state: LifecycleStepState;
};

export type BannerEscalation = {
  thresholdMs: number;
  startedAtMs: number;
  isVisible: boolean;
  escalatedAtMs: number | null;
};

export type SetupScreenReason =
  | "missing-model-directory"
  | "path-mismatch"
  | "no-usable-model-settings"
  | "missing-required-model"
  | "download-failure"
  | "verification-failure";

export type LifecycleModeAvailability = {
  mode: LifecycleMode;
  status: "available" | "degraded" | "blocked";
  summary: string;
  blockedBy: ModelCapability[];
};

export type LifecycleModeAvailabilityMap = Record<LifecycleMode, LifecycleModeAvailability>;

export type ReadyToastPolicy = {
  enabled: boolean;
  showOnHealthyStartup: boolean;
};

export type DownloadConfirmationState = {
  required: boolean;
  confirmedAtMs: number | null;
};

export type RecoveryActionId = "retry" | "change-path" | "copy-diagnostics";

export type LifecycleRecoveryAction = {
  id: RecoveryActionId;
  enabled: boolean;
  label: string;
};

export type LifecycleArtifactHealth = {
  capability: ModelCapability;
  artifactId: string;
  displayName: string;
  isAvailable: boolean;
  issue: string | null;
};

export type LifecycleDiagnostics = {
  summary: string;
  generatedAtMs: number;
  lines: string[];
};

export type DownloadProgressLine = {
  artifactId: string;
  label: string;
  percent: number;
  bytesDownloaded: number;
  bytesTotal: number;
  status: "pending" | "downloading" | "verifying" | "complete" | "failed";
};

export type ModelLifecycleState =
  | "idle"
  | "checking"
  | "ready"
  | "degraded"
  | "setup-required"
  | "downloading"
  | "recovery-required";

export type ModelLifecycleSnapshot = {
  state: ModelLifecycleState;
  updatedAtMs: number;
  steps: ModelLifecycleStep[];
  banner: BannerEscalation;
  setupReason: SetupScreenReason | null;
  modeAvailability: LifecycleModeAvailabilityMap;
  readyToast: ReadyToastPolicy;
  downloadConfirmation: DownloadConfirmationState;
  downloadProgress: DownloadProgressLine[];
  artifacts: LifecycleArtifactHealth[];
  recoveryActions: LifecycleRecoveryAction[];
  diagnostics: LifecycleDiagnostics;
};
