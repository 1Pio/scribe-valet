import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ArtifactInstallError } from "./artifact-installer";
import { ModelLifecycleService } from "./model-lifecycle-service";
import type { DownloadResumeStore } from "./download-resume-store";
import type { RequiredModelArtifact } from "./model-manifest";
import type { StoragePathsState } from "../../shared/types/storage-config";

const BASE_PATHS: StoragePathsState = {
  defaults: {
    models: "/tmp/models",
    config: "/tmp/config",
    tools: "/tmp/tools",
    logs: "/tmp/logs"
  },
  active: {
    models: "/tmp/models",
    config: "/tmp/config",
    tools: "/tmp/tools",
    logs: "/tmp/logs"
  },
  override: {
    customRoot: null,
    categoryOverrides: {}
  }
};

const TEST_ARTIFACTS: ReadonlyArray<RequiredModelArtifact> = [
  {
    id: "stt",
    capability: "stt",
    displayName: "Speech",
    progressLabel: "Speech model",
    fileName: "stt.bin",
    downloadUrl: "https://example.test/stt.bin",
    expectedBytes: 1,
    checksumSha256: "abc"
  },
  {
    id: "llm",
    capability: "llm",
    displayName: "Assistant",
    progressLabel: "Assistant model",
    fileName: "llm.bin",
    downloadUrl: "https://example.test/llm.bin",
    expectedBytes: 1,
    checksumSha256: "def"
  },
  {
    id: "tts",
    capability: "tts",
    displayName: "Voice",
    progressLabel: "Voice model",
    fileName: "tts.bin",
    downloadUrl: "https://example.test/tts.bin",
    expectedBytes: 1,
    checksumSha256: "ghi"
  }
];

const NOOP_RESUME_STORE: DownloadResumeStore = {
  get: async () => null,
  set: async () => undefined,
  delete: async () => undefined
};

describe("ModelLifecycleService", () => {
  it("emits ready state when all artifacts are present", async () => {
    const service = new ModelLifecycleService({
      resumeStore: NOOP_RESUME_STORE,
      loadStoragePaths: async () => BASE_PATHS,
      artifacts: TEST_ARTIFACTS,
      statImpl: async () => ({})
    });

    const snapshot = await service.startCheck();

    expect(snapshot.state).toBe("ready");
    expect(snapshot.setupReason).toBeNull();
    expect(snapshot.modeAvailability.assistant.status).toBe("available");
    expect(snapshot.modeAvailability.dictation.status).toBe("available");
    expect(snapshot.readyToast.showOnHealthyStartup).toBe(true);
  });

  it("keeps dictation available with raw-output notice when LLM is missing", async () => {
    const service = new ModelLifecycleService({
      resumeStore: NOOP_RESUME_STORE,
      loadStoragePaths: async () => BASE_PATHS,
      artifacts: TEST_ARTIFACTS,
      statImpl: async (filePath) => {
        if (filePath.endsWith(path.join("models", "llm.bin"))) {
          const error = new Error("missing") as Error & { code: string };
          error.code = "ENOENT";
          throw error;
        }

        return {};
      }
    });

    const snapshot = await service.startCheck();

    expect(snapshot.state).toBe("degraded");
    expect(snapshot.setupReason).toBeNull();
    expect(snapshot.modeAvailability.assistant.status).toBe("blocked");
    expect(snapshot.modeAvailability.dictation.status).toBe("degraded");
    expect(snapshot.modeAvailability.dictation.summary).toContain("raw output");
    expect(snapshot.downloadConfirmation.required).toBe(true);
  });

  it("expands retry attempts for transient network failures and exposes recovery actions", async () => {
    const installAttemptCounter = vi.fn(async () => {
      throw new ArtifactInstallError({
        artifactId: "stt",
        code: "network-error",
        hint: "retryable-network",
        message: "network unstable",
        httpStatus: null,
        resumedFromBytes: 0,
        restartedFromScratch: false,
        expectedSha256: "abc",
        actualSha256: null
      });
    });

    const service = new ModelLifecycleService({
      resumeStore: NOOP_RESUME_STORE,
      loadStoragePaths: async () => BASE_PATHS,
      artifacts: TEST_ARTIFACTS,
      statImpl: async () => {
        const error = new Error("missing") as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      },
      installArtifactImpl: installAttemptCounter
    });

    service.confirmDownload();
    const snapshot = await service.startCheck();

    expect(snapshot.state).toBe("recovery-required");
    expect(snapshot.setupReason).toBe("download-failure");
    expect(snapshot.recoveryActions.map((action) => action.id)).toEqual([
      "retry",
      "change-path",
      "copy-diagnostics"
    ]);
    expect(snapshot.diagnostics.lines).toContain("Attempts: 5");
    expect(installAttemptCounter).toHaveBeenCalledTimes(5);
  });

  it("keeps baseline retries for checksum mismatch without expansion", async () => {
    const installAttemptCounter = vi.fn(async () => {
      throw new ArtifactInstallError({
        artifactId: "stt",
        code: "integrity-mismatch",
        hint: "clear-partial-and-retry",
        message: "checksum mismatch",
        httpStatus: null,
        resumedFromBytes: 0,
        restartedFromScratch: false,
        expectedSha256: "abc",
        actualSha256: "bad"
      });
    });

    const service = new ModelLifecycleService({
      resumeStore: NOOP_RESUME_STORE,
      loadStoragePaths: async () => BASE_PATHS,
      artifacts: TEST_ARTIFACTS,
      statImpl: async () => {
        const error = new Error("missing") as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      },
      installArtifactImpl: installAttemptCounter
    });

    service.confirmDownload();
    const snapshot = await service.startCheck();

    expect(snapshot.state).toBe("recovery-required");
    expect(snapshot.setupReason).toBe("verification-failure");
    expect(snapshot.diagnostics.lines).toContain("Attempts: 3");
    expect(installAttemptCounter).toHaveBeenCalledTimes(3);
  });

  it("escalates checking banner after threshold while startup is still running", async () => {
    vi.useFakeTimers();

    let resolvePaths: ((value: StoragePathsState) => void) | undefined;
    const loadStoragePaths = vi.fn(
      () =>
        new Promise<StoragePathsState>((resolve) => {
          resolvePaths = resolve;
        })
    );

    const service = new ModelLifecycleService({
      resumeStore: NOOP_RESUME_STORE,
      loadStoragePaths,
      artifacts: TEST_ARTIFACTS,
      statImpl: async () => ({})
    });

    const bannerStates: boolean[] = [];
    service.onSnapshot((snapshot) => {
      if (snapshot.state === "checking") {
        bannerStates.push(snapshot.banner.isVisible);
      }
    });

    const pending = service.startCheck();
    vi.advanceTimersByTime(3000);
    resolvePaths?.(BASE_PATHS);
    await pending;

    expect(bannerStates).toContain(false);
    expect(bannerStates).toContain(true);

    vi.useRealTimers();
  });
});
