import { EventEmitter } from "node:events";
import path from "node:path";
import { stat } from "node:fs/promises";
import {
  ArtifactInstallError,
  installArtifact,
  type InstallArtifactResult
} from "./artifact-installer";
import {
  getRequiredModelBundleArtifacts,
  type RequiredModelArtifact
} from "./model-manifest";
import type { DownloadResumeStore } from "./download-resume-store";
import {
  MODEL_LIFECYCLE_BANNER_ESCALATION_MS,
  type BannerEscalation,
  type LifecycleModeAvailability,
  type LifecycleModeAvailabilityMap,
  type LifecycleRecoveryAction,
  type LifecycleStepState,
  type ModelCapability,
  type ModelLifecycleSnapshot,
  type ModelLifecycleState,
  type SetupScreenReason
} from "../../shared/types/model-lifecycle";
import type { StorageOverrideConfig, StoragePathsState } from "../../shared/types/storage-config";

type TimerHandle = ReturnType<typeof setTimeout>;

type ResolvedPathsLoader = () => Promise<StoragePathsState>;

type OverrideSaver = (
  override: Partial<StorageOverrideConfig> | null | undefined
) => Promise<StorageOverrideConfig>;

type ArtifactInstaller = (input: {
  artifact: {
    id: string;
    fileName: string;
    downloadUrl: string;
    expectedSha256: string;
  };
  installDir: string;
  resumeStore: DownloadResumeStore;
  signal?: AbortSignal;
}) => Promise<InstallArtifactResult>;

type FileStat = (filePath: string) => Promise<unknown>;

type Clock = () => number;

export type ModelLifecycleServiceOptions = {
  resumeStore: DownloadResumeStore;
  loadStoragePaths: ResolvedPathsLoader;
  saveStorageOverride?: OverrideSaver;
  artifacts?: ReadonlyArray<RequiredModelArtifact>;
  installArtifactImpl?: ArtifactInstaller;
  statImpl?: FileStat;
  now?: Clock;
  readyToastEnabled?: boolean;
  bannerEscalationMs?: number;
};

type FailureDiagnostics = {
  artifactId: string;
  sourceUrl: string;
  reason: SetupScreenReason;
  message: string;
  code: string;
  hint: string;
  attempts: number;
};

export class ModelLifecycleService extends EventEmitter {
  private readonly resumeStore: DownloadResumeStore;
  private readonly loadStoragePaths: ResolvedPathsLoader;
  private readonly saveStorageOverride: OverrideSaver | null;
  private readonly artifacts: ReadonlyArray<RequiredModelArtifact>;
  private readonly installArtifactImpl: ArtifactInstaller;
  private readonly statImpl: FileStat;
  private readonly now: Clock;
  private readonly readyToastEnabled: boolean;
  private readonly bannerEscalationMs: number;

  private snapshot: ModelLifecycleSnapshot;
  private downloadConfirmed = false;
  private bannerTimer: TimerHandle | null = null;

  public constructor(options: ModelLifecycleServiceOptions) {
    super();
    this.resumeStore = options.resumeStore;
    this.loadStoragePaths = options.loadStoragePaths;
    this.saveStorageOverride = options.saveStorageOverride ?? null;
    this.artifacts = options.artifacts ?? getRequiredModelBundleArtifacts();
    this.installArtifactImpl = options.installArtifactImpl ?? installArtifact;
    this.statImpl = options.statImpl ?? stat;
    this.now = options.now ?? (() => Date.now());
    this.readyToastEnabled = options.readyToastEnabled ?? true;
    this.bannerEscalationMs = options.bannerEscalationMs ?? MODEL_LIFECYCLE_BANNER_ESCALATION_MS;
    this.snapshot = this.createSnapshot("idle", {
      setupReason: null,
      diagnosticsSummary: "Model readiness has not started yet.",
      diagnosticsLines: [],
      modeAvailability: createBlockedModeAvailability("Waiting for first startup check."),
      artifacts: []
    });
  }

  public getSnapshot(): ModelLifecycleSnapshot {
    return this.snapshot;
  }

  public onSnapshot(listener: (snapshot: ModelLifecycleSnapshot) => void): () => void {
    this.on("snapshot", listener);
    return () => {
      this.off("snapshot", listener);
    };
  }

  public async startCheck(): Promise<ModelLifecycleSnapshot> {
    this.startCheckingPhase();

    let storagePaths: StoragePathsState;
    try {
      storagePaths = await this.loadStoragePaths();
    } catch (error) {
      this.clearBannerTimer();
      this.publish(
        this.createSnapshot("setup-required", {
          setupReason: "no-usable-model-settings",
          diagnosticsSummary: "Unable to resolve model storage paths.",
          diagnosticsLines: [asErrorMessage(error)],
          modeAvailability: createBlockedModeAvailability(
            "Storage configuration is invalid. Assistant and Dictation are blocked until fixed."
          ),
          artifacts: [],
          recoveryActions: createRecoveryActions(),
          requireDownloadConfirmation: false
        })
      );
      return this.snapshot;
    }

    const modelRoot = storagePaths.active.models;
    const health = await this.readArtifactHealth(modelRoot);
    const missing = health.filter((item) => !item.isAvailable);

    if (missing.length === 0) {
      this.clearBannerTimer();
      this.publish(
        this.createSnapshot("ready", {
          setupReason: null,
          diagnosticsSummary: "All required model artifacts are present.",
          diagnosticsLines: [
            `Model root: ${modelRoot}`,
            `Checked artifacts: ${this.artifacts.length}`
          ],
          modeAvailability: buildModeAvailability(health),
          artifacts: health,
          stepOverride: {
            inspect: "ok",
            install: "ok",
            finalize: "ok"
          }
        })
      );
      return this.snapshot;
    }

    if (!this.downloadConfirmed) {
      this.clearBannerTimer();
      const setupReason = isBlockingSetupReason(health)
        ? "missing-required-model"
        : null;
      const state = setupReason ? "setup-required" : "degraded";
      this.publish(
        this.createSnapshot(state, {
          setupReason,
          diagnosticsSummary:
            "Some required artifacts are missing. Download confirmation is required once before installation.",
          diagnosticsLines: [
            `Model root: ${modelRoot}`,
            ...missing.map((item) => `${item.displayName}: missing`)
          ],
          modeAvailability: buildModeAvailability(health),
          artifacts: health,
          recoveryActions: createRecoveryActions(),
          requireDownloadConfirmation: true,
          stepOverride: {
            inspect: "warning",
            install: "pending",
            finalize: "warning"
          }
        })
      );
      return this.snapshot;
    }

    const missingArtifactIds = missing.map((item) => item.artifactId);
    this.publish(
      this.createSnapshot("downloading", {
        setupReason: null,
        diagnosticsSummary: "Downloading missing model artifacts.",
        diagnosticsLines: [
          `Model root: ${modelRoot}`,
          ...missing.map((item) => `Queued: ${item.displayName}`)
        ],
        modeAvailability: buildModeAvailability(health),
        artifacts: health,
        recoveryActions: createRecoveryActions(),
        requireDownloadConfirmation: false,
        downloadProgress: createDownloadProgress(this.artifacts, new Set(missingArtifactIds)),
        stepOverride: {
          inspect: "warning",
          install: "running",
          finalize: "warning"
        }
      })
    );

    const installResult = await this.installMissingArtifacts(modelRoot, missingArtifactIds);
    if (!installResult.ok) {
      this.clearBannerTimer();
      const nextHealth = await this.readArtifactHealth(modelRoot);
      this.publish(
        this.createSnapshot("recovery-required", {
          setupReason: installResult.failure.reason,
          diagnosticsSummary: installResult.failure.message,
          diagnosticsLines: [
            `Model root: ${modelRoot}`,
            `Artifact: ${installResult.failure.artifactId}`,
            `Source URL: ${installResult.failure.sourceUrl}`,
            `Code: ${installResult.failure.code}`,
            `Hint: ${installResult.failure.hint}`,
            `Action: ${getFailureAction(installResult.failure.hint)}`,
            `Attempts: ${installResult.failure.attempts}`
          ],
          modeAvailability: buildModeAvailability(nextHealth),
          artifacts: nextHealth,
          recoveryActions: createRecoveryActions(),
          requireDownloadConfirmation: false,
          stepOverride: {
            inspect: "warning",
            install: "error",
            finalize: "warning"
          }
        })
      );
      return this.snapshot;
    }

    const postInstallHealth = await this.readArtifactHealth(modelRoot);
    const stillMissing = postInstallHealth.filter((item) => !item.isAvailable);
    this.clearBannerTimer();

    if (stillMissing.length === 0) {
      this.publish(
        this.createSnapshot("ready", {
          setupReason: null,
          diagnosticsSummary: "All required artifacts are installed and verified.",
          diagnosticsLines: [
            `Installed artifacts: ${this.artifacts.length}`,
            `Model root: ${modelRoot}`
          ],
          modeAvailability: buildModeAvailability(postInstallHealth),
          artifacts: postInstallHealth,
          stepOverride: {
            inspect: "warning",
            install: "ok",
            finalize: "ok"
          }
        })
      );
      return this.snapshot;
    }

    this.publish(
      this.createSnapshot("degraded", {
        setupReason: null,
        diagnosticsSummary: "Startup completed with partial model availability.",
        diagnosticsLines: [
          `Model root: ${modelRoot}`,
          ...stillMissing.map((item) => `${item.displayName}: unavailable`)
        ],
        modeAvailability: buildModeAvailability(postInstallHealth),
        artifacts: postInstallHealth,
        recoveryActions: createRecoveryActions(),
        requireDownloadConfirmation: false,
        stepOverride: {
          inspect: "warning",
          install: "warning",
          finalize: "warning"
        }
      })
    );

    return this.snapshot;
  }

  public async confirmDownload(): Promise<ModelLifecycleSnapshot> {
    this.downloadConfirmed = true;
    return this.startCheck();
  }

  public async retry(): Promise<ModelLifecycleSnapshot> {
    return this.startCheck();
  }

  public async changePath(customRoot: string): Promise<ModelLifecycleSnapshot> {
    if (!this.saveStorageOverride) {
      throw new Error("Model lifecycle service cannot change path without saveStorageOverride.");
    }

    await this.saveStorageOverride({ customRoot });
    this.downloadConfirmed = false;
    return this.startCheck();
  }

  public copyDiagnostics(): string {
    return this.snapshot.diagnostics.lines.join("\n");
  }

  private startCheckingPhase(): void {
    this.clearBannerTimer();
    const startedAtMs = this.now();
    const banner: BannerEscalation = {
      thresholdMs: this.bannerEscalationMs,
      startedAtMs,
      isVisible: false,
      escalatedAtMs: null
    };

    this.publish(
      this.createSnapshot("checking", {
        setupReason: null,
        diagnosticsSummary: "Checking model readiness.",
        diagnosticsLines: [],
        modeAvailability: createBlockedModeAvailability("Startup checks are in progress."),
        artifacts: [],
        banner,
        stepOverride: {
          resolve: "running",
          inspect: "pending",
          install: "pending",
          finalize: "pending"
        }
      })
    );

    this.bannerTimer = setTimeout(() => {
      if (this.snapshot.state !== "checking") {
        return;
      }

      this.publish({
        ...this.snapshot,
        updatedAtMs: this.now(),
        banner: {
          ...this.snapshot.banner,
          isVisible: true,
          escalatedAtMs: this.now()
        }
      });
    }, this.bannerEscalationMs);
  }

  private async readArtifactHealth(modelRoot: string): Promise<ModelLifecycleSnapshot["artifacts"]> {
    const result = [] as ModelLifecycleSnapshot["artifacts"];
    for (const artifact of this.artifacts) {
      const filePath = path.join(modelRoot, artifact.fileName);
      const exists = await this.pathExists(filePath);
      result.push({
        capability: artifact.capability as ModelCapability,
        artifactId: artifact.id,
        displayName: artifact.displayName,
        isAvailable: exists,
        issue: exists ? null : "missing-file"
      });
    }

    return result;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await this.statImpl(filePath);
      return true;
    } catch (error) {
      if (isMissingFileError(error)) {
        return false;
      }
      throw error;
    }
  }

  private async installMissingArtifacts(
    modelRoot: string,
    missingArtifactIds: string[]
  ): Promise<{ ok: true } | { ok: false; failure: FailureDiagnostics }> {
    const missingSet = new Set(missingArtifactIds);
    const progress = createDownloadProgress(this.artifacts, missingSet);
    for (const artifact of this.artifacts) {
      if (!missingSet.has(artifact.id)) {
        continue;
      }

      updateDownloadProgress(progress, artifact.id, "downloading", 0);
      this.publish({
        ...this.snapshot,
        state: "downloading",
        updatedAtMs: this.now(),
        downloadProgress: progress.map((line) => ({ ...line }))
      });

      let maxAttempts = 3;
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          await this.installArtifactImpl({
            artifact: {
              id: artifact.id,
              fileName: artifact.fileName,
              downloadUrl: artifact.downloadUrl,
              expectedSha256: artifact.checksumSha256
            },
            installDir: modelRoot,
            resumeStore: this.resumeStore
          });
          updateDownloadProgress(progress, artifact.id, "complete", 100);
          this.publish({
            ...this.snapshot,
            state: "downloading",
            updatedAtMs: this.now(),
            downloadProgress: progress.map((line) => ({ ...line }))
          });
          break;
        } catch (error) {
          if (!(error instanceof ArtifactInstallError)) {
            updateDownloadProgress(progress, artifact.id, "failed", 0);
            this.publish({
              ...this.snapshot,
              state: "downloading",
              updatedAtMs: this.now(),
              downloadProgress: progress.map((line) => ({ ...line }))
            });
            return {
              ok: false,
              failure: {
                artifactId: artifact.id,
                sourceUrl: artifact.downloadUrl,
                reason: "download-failure",
                message: asErrorMessage(error),
                code: "unknown",
                hint: "check-disk-permissions",
                attempts: attempt
              }
            };
          }

          const transient = isTransientInstallFailure(error);
          if (transient) {
            maxAttempts = 5;
          }

          const hasMoreAttempts = attempt < maxAttempts;
          if (hasMoreAttempts) {
            updateDownloadProgress(progress, artifact.id, "downloading", 0);
            continue;
          }

          updateDownloadProgress(progress, artifact.id, "failed", 0);
          this.publish({
            ...this.snapshot,
            state: "downloading",
            updatedAtMs: this.now(),
            downloadProgress: progress.map((line) => ({ ...line }))
          });
          return {
            ok: false,
            failure: {
              artifactId: artifact.id,
              sourceUrl: artifact.downloadUrl,
              reason:
                error.diagnostics.code === "integrity-mismatch"
                  ? "verification-failure"
                  : "download-failure",
              message: error.diagnostics.message,
              code: error.diagnostics.code,
              hint: error.diagnostics.hint,
              attempts: attempt
            }
          };
        }
      }
    }

    return { ok: true };
  }

  private createSnapshot(
    state: ModelLifecycleState,
    input: {
      setupReason: SetupScreenReason | null;
      diagnosticsSummary: string;
      diagnosticsLines: string[];
      modeAvailability: LifecycleModeAvailabilityMap;
      artifacts: ModelLifecycleSnapshot["artifacts"];
      downloadProgress?: ModelLifecycleSnapshot["downloadProgress"];
      recoveryActions?: LifecycleRecoveryAction[];
      banner?: BannerEscalation;
      requireDownloadConfirmation?: boolean;
      stepOverride?: {
        resolve?: LifecycleStepState;
        inspect?: LifecycleStepState;
        install?: LifecycleStepState;
        finalize?: LifecycleStepState;
      };
    }
  ): ModelLifecycleSnapshot {
    return {
      state,
      updatedAtMs: this.now(),
      steps: [
        {
          id: "resolve-storage-path",
          label: "Resolve model storage path",
          detail: "Load active model directory from storage configuration.",
          state: input.stepOverride?.resolve ?? "ok"
        },
        {
          id: "inspect-installed-artifacts",
          label: "Inspect installed artifacts",
          detail: "Verify required STT/LLM/TTS model files are present.",
          state: input.stepOverride?.inspect ?? "ok"
        },
        {
          id: "install-missing-artifacts",
          label: "Install missing artifacts",
          detail:
            "Apply one-time confirmation gate, then install missing artifacts with retry policy.",
          state: input.stepOverride?.install ?? "ok"
        },
        {
          id: "finalize-mode-availability",
          label: "Finalize mode availability",
          detail: "Compute Assistant/Dictation availability from artifact health.",
          state: input.stepOverride?.finalize ?? "ok"
        }
      ],
      banner:
        input.banner ?? {
          thresholdMs: this.bannerEscalationMs,
          startedAtMs: this.now(),
          isVisible: false,
          escalatedAtMs: null
        },
      setupReason: input.setupReason,
      modeAvailability: input.modeAvailability,
      readyToast: {
        enabled: this.readyToastEnabled,
        showOnHealthyStartup: this.readyToastEnabled && state === "ready"
      },
      downloadConfirmation: {
        required: input.requireDownloadConfirmation ?? false,
        confirmedAtMs: this.downloadConfirmed ? this.now() : null
      },
      downloadProgress:
        input.downloadProgress ??
        this.artifacts.map((artifact) => ({
          artifactId: artifact.id,
          label: artifact.progressLabel,
          percent: 0,
          bytesDownloaded: 0,
          bytesTotal: artifact.expectedBytes,
          status: "pending"
        })),
      artifacts: input.artifacts,
      recoveryActions: input.recoveryActions ?? [],
      diagnostics: {
        summary: input.diagnosticsSummary,
        generatedAtMs: this.now(),
        lines: input.diagnosticsLines
      }
    };
  }

  private publish(snapshot: ModelLifecycleSnapshot): void {
    this.snapshot = snapshot;
    this.emit("snapshot", snapshot);
  }

  private clearBannerTimer(): void {
    if (!this.bannerTimer) {
      return;
    }

    clearTimeout(this.bannerTimer);
    this.bannerTimer = null;
  }
}

function isTransientInstallFailure(error: ArtifactInstallError): boolean {
  return (
    error.diagnostics.code === "network-error" ||
    error.diagnostics.hint === "retryable-network" ||
    error.diagnostics.hint === "retryable-server"
  );
}

function createDownloadProgress(
  artifacts: ReadonlyArray<RequiredModelArtifact>,
  missingSet: Set<string>
): ModelLifecycleSnapshot["downloadProgress"] {
  return artifacts.map((artifact) => {
    const isMissing = missingSet.has(artifact.id);
    return {
      artifactId: artifact.id,
      label: artifact.progressLabel,
      percent: isMissing ? 0 : 100,
      bytesDownloaded: isMissing ? 0 : artifact.expectedBytes,
      bytesTotal: artifact.expectedBytes,
      status: isMissing ? "pending" : "complete"
    };
  });
}

function updateDownloadProgress(
  progress: ModelLifecycleSnapshot["downloadProgress"],
  artifactId: string,
  status: ModelLifecycleSnapshot["downloadProgress"][number]["status"],
  percent: number
): void {
  const line = progress.find((entry) => entry.artifactId === artifactId);
  if (!line) {
    return;
  }

  line.status = status;
  line.percent = percent;
  line.bytesDownloaded = Math.round((line.bytesTotal * percent) / 100);
}

function getFailureAction(hint: string): string {
  if (hint === "retryable-network") {
    return "Check internet connection or firewall, then retry.";
  }

  if (hint === "retryable-server") {
    return "Artifact host returned server errors. Retry shortly or switch network.";
  }

  if (hint === "manual-check-url") {
    return "Artifact source may be unavailable. Verify URL access and manifest metadata.";
  }

  if (hint === "clear-partial-and-retry") {
    return "Partial file failed integrity check. Retry to re-download from scratch.";
  }

  return "Verify directory permissions and available disk space, then retry.";
}

function isBlockingSetupReason(artifacts: ModelLifecycleSnapshot["artifacts"]): boolean {
  return artifacts.some((artifact) => artifact.capability === "stt" && !artifact.isAvailable);
}

function createRecoveryActions(): LifecycleRecoveryAction[] {
  return [
    { id: "retry", enabled: true, label: "Retry" },
    { id: "change-path", enabled: true, label: "Change path directory" },
    { id: "copy-diagnostics", enabled: true, label: "Show/Copy diagnostics report" }
  ];
}

function buildModeAvailability(
  artifacts: ModelLifecycleSnapshot["artifacts"]
): LifecycleModeAvailabilityMap {
  const byCapability = new Map<ModelCapability, boolean>();
  for (const artifact of artifacts) {
    byCapability.set(artifact.capability, artifact.isAvailable);
  }

  const sttReady = byCapability.get("stt") === true;
  const llmReady = byCapability.get("llm") === true;
  const ttsReady = byCapability.get("tts") === true;

  const assistantBlockedBy: ModelCapability[] = [];
  if (!llmReady) {
    assistantBlockedBy.push("llm");
  }
  if (!ttsReady) {
    assistantBlockedBy.push("tts");
  }
  if (!sttReady) {
    assistantBlockedBy.push("stt");
  }

  const assistant: LifecycleModeAvailability =
    assistantBlockedBy.length === 0
      ? {
          mode: "assistant",
          status: "available",
          summary: "Assistant is fully available.",
          blockedBy: []
        }
      : {
          mode: "assistant",
          status: "blocked",
          summary: "Assistant is blocked until STT, LLM, and TTS are all available.",
          blockedBy: assistantBlockedBy
        };

  const dictation: LifecycleModeAvailability = sttReady
    ? {
        mode: "dictation",
        status: llmReady && ttsReady ? "available" : "degraded",
        summary:
          llmReady && ttsReady
            ? "Dictation is available with AI enrichment."
            : "Dictation is available with raw output because Assistant models are unavailable.",
        blockedBy: []
      }
    : {
        mode: "dictation",
        status: "blocked",
        summary: "Dictation is blocked until STT is healthy.",
        blockedBy: ["stt"]
      };

  return {
    assistant,
    dictation
  };
}

function createBlockedModeAvailability(reason: string): LifecycleModeAvailabilityMap {
  return {
    assistant: {
      mode: "assistant",
      status: "blocked",
      summary: reason,
      blockedBy: ["stt", "llm", "tts"]
    },
    dictation: {
      mode: "dictation",
      status: "blocked",
      summary: reason,
      blockedBy: ["stt"]
    }
  };
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const withCode = error as { code?: string };
  return withCode.code === "ENOENT";
}
