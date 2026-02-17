import { useEffect, useMemo, useState, type ReactElement } from "react";
import type {
  LifecycleModeAvailabilityMap,
  ModelLifecycleSnapshot
} from "../../shared/types/model-lifecycle";
import type { ModelLifecycleBridge } from "../../preload/model-lifecycle-bridge";
import { DownloadBundleModal, shouldShowDownloadDialog } from "./DownloadBundleModal";
import { ReadinessToast } from "./ReadinessToast";
import { StoragePathSettings } from "./StoragePathSettings";

export type ReadinessDialogState = "none" | "download" | "setup";

type ReadinessGateProps = {
  modelLifecycleBridge: ModelLifecycleBridge;
  children: ReactElement;
  onDialogStateChange?: (state: ReadinessDialogState) => void;
};

export function ReadinessGate({
  modelLifecycleBridge,
  children,
  onDialogStateChange
}: ReadinessGateProps): ReactElement {
  const [snapshot, setSnapshot] = useState<ModelLifecycleSnapshot>(createInitialSnapshot());
  const [readyToastShown, setReadyToastShown] = useState(false);
  const modeNotice = useMemo(() => getModeAvailabilityNotice(snapshot.modeAvailability), [snapshot]);
  const activePath = useMemo(() => extractModelRoot(snapshot), [snapshot]);
  const activeDialog = useMemo(() => deriveDialogState(snapshot), [snapshot]);

  useEffect(() => {
    let disposed = false;

    const loadState = async (): Promise<void> => {
      const current = await modelLifecycleBridge.getState();
      if (disposed) {
        return;
      }

      setSnapshot(current);
      if (current.state === "idle") {
        const next = await modelLifecycleBridge.startCheck();
        if (!disposed) {
          setSnapshot(next);
        }
      }
    };

    void loadState();

    const unsubscribe = modelLifecycleBridge.onStatusChanged((nextSnapshot) => {
      if (!disposed) {
        setSnapshot(nextSnapshot);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [modelLifecycleBridge]);

  useEffect(() => {
    if (snapshot.state !== "ready") {
      setReadyToastShown(false);
      return;
    }

    if (snapshot.readyToast.enabled && snapshot.readyToast.showOnHealthyStartup) {
      setReadyToastShown(true);
    }
  }, [snapshot]);

  const copyReadinessReport = (): void => {
    void modelLifecycleBridge.copyReport().then(async (result) => {
      if (!result.ok) {
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(result.report);
      }
    });
  };

  const applyPathChange = async (nextPath: string): Promise<void> => {
    const nextSnapshot = await modelLifecycleBridge.changePath(nextPath);
    setSnapshot(nextSnapshot);
  };

  useEffect(() => {
    onDialogStateChange?.(activeDialog);
  }, [activeDialog, onDialogStateChange]);

  const showSetupScreen = activeDialog === "setup";
  const blockNormalFlow = shouldBlockNormalFlow(snapshot) || activeDialog === "download";

  return (
    <>
      <ReadinessToast
        visible={readyToastShown}
        onCopyReport={() => {
          copyReadinessReport();
        }}
      />

      {snapshot.state === "checking" ? (
        <section
          aria-live="polite"
          aria-label="Readiness checks"
          style={{
            border: "1px solid #d8dde8",
            borderRadius: "0.75rem",
            padding: "0.75rem",
            marginBottom: "0.75rem"
          }}
        >
          <strong>
            <span aria-hidden="true">○</span> Checking startup readiness
          </strong>
          <p style={{ margin: "0.35rem 0" }}>{snapshot.diagnostics.summary}</p>
          {snapshot.banner.isVisible ? (
            <p style={{ margin: "0.35rem 0", color: "#9a5d03" }}>
              Still checking. You can keep waiting while diagnostics gather.
            </p>
          ) : null}

          <details>
            <summary>Show checklist</summary>
            <ul>
              {snapshot.steps.map((step) => (
                <li key={step.id}>
                  {step.label} - {step.state}
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

      {modeNotice && activeDialog === "none" ? (
        <section
          aria-live="polite"
          style={{
            border: "1px solid #f3c777",
            background: "#fff9ee",
            borderRadius: "0.75rem",
            padding: "0.7rem",
            marginBottom: "0.75rem"
          }}
        >
          <strong>Mode availability</strong>
          <p style={{ margin: "0.35rem 0" }}>{modeNotice}</p>
        </section>
      ) : null}

      {activeDialog === "download" ? (
        <DownloadBundleModal
          snapshot={snapshot}
          installPath={activePath}
          onChangePath={(nextPath) => applyPathChange(nextPath)}
          onConfirm={() => {
            void modelLifecycleBridge.confirmDownload().then((next) => {
              setSnapshot(next);
            });
          }}
        />
      ) : null}

      {showSetupScreen ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          aria-label="Readiness setup required"
          style={{
            border: "1px solid #f3c777",
            background: "#fff9ee",
            borderRadius: "0.75rem",
            padding: "0.85rem",
            marginBottom: "0.85rem",
            boxShadow: "0 10px 26px rgba(74, 45, 10, 0.12)"
          }}
        >
          <h2 style={{ marginTop: 0 }}>Finish model setup before using all features</h2>
          {snapshot.state === "recovery-required" ? (
            <p>
              Safety check failed after automatic retries. Review diagnostics, retry, or switch model path
              before continuing.
            </p>
          ) : (
            <p>{snapshot.diagnostics.summary}</p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <button
              onClick={() => {
                void modelLifecycleBridge.retry().then((next) => {
                  setSnapshot(next);
                });
              }}
            >
              Retry
            </button>
            <button
              onClick={() => {
                copyReadinessReport();
              }}
            >
              Show/Copy diagnostics report
            </button>
          </div>

          <StoragePathSettings
            activePath={activePath}
            expectedPathHint={getExpectedModelsPathHint(activePath)}
            defaultExpanded={snapshot.state === "recovery-required"}
            onChangePath={(nextPath) => applyPathChange(nextPath)}
          />

          <details>
            <summary>Diagnostic details</summary>
            <ul>
              {snapshot.diagnostics.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

      {!blockNormalFlow ? children : <main />}
    </>
  );
}

function createInitialSnapshot(): ModelLifecycleSnapshot {
  const blocked: LifecycleModeAvailabilityMap = {
    assistant: {
      mode: "assistant",
      status: "blocked",
      summary: "Startup checks are pending.",
      blockedBy: ["stt", "llm", "tts"]
    },
    dictation: {
      mode: "dictation",
      status: "blocked",
      summary: "Startup checks are pending.",
      blockedBy: ["stt"]
    }
  };

  return {
    state: "idle",
    updatedAtMs: Date.now(),
    steps: [],
    banner: {
      thresholdMs: 3000,
      startedAtMs: Date.now(),
      isVisible: false,
      escalatedAtMs: null
    },
    setupReason: null,
    modeAvailability: blocked,
    readyToast: {
      enabled: true,
      showOnHealthyStartup: false
    },
    downloadConfirmation: {
      required: false,
      confirmedAtMs: null
    },
    downloadProgress: [],
    artifacts: [],
    recoveryActions: [],
    diagnostics: {
      summary: "Checking model readiness.",
      generatedAtMs: Date.now(),
      lines: []
    }
  };
}

export function shouldBlockNormalFlow(snapshot: ModelLifecycleSnapshot): boolean {
  return snapshot.state === "setup-required" || snapshot.state === "recovery-required";
}

export function getModeAvailabilityNotice(modeAvailability: LifecycleModeAvailabilityMap): string | null {
  if (modeAvailability.assistant.status !== "blocked") {
    return null;
  }

  if (modeAvailability.dictation.status === "degraded" || modeAvailability.dictation.status === "available") {
    return `${modeAvailability.dictation.summary} Assistant remains blocked.`;
  }

  return modeAvailability.assistant.summary;
}

function extractModelRoot(snapshot: ModelLifecycleSnapshot): string {
  const matchedLine = snapshot.diagnostics.lines.find((line) => line.startsWith("Model root: "));
  if (!matchedLine) {
    return "(pending path resolution)";
  }

  return matchedLine.replace("Model root: ", "");
}

function getExpectedModelsPathHint(activePath: string): string {
  if (activePath !== "(pending path resolution)") {
    return activePath;
  }

  return "%LOCALAPPDATA%\\Scribe-Valet\\models";
}

export function deriveDialogState(snapshot: ModelLifecycleSnapshot): ReadinessDialogState {
  if (snapshot.state !== "recovery-required" && shouldShowDownloadDialog(snapshot)) {
    return "download";
  }

  if (shouldBlockNormalFlow(snapshot)) {
    return "setup";
  }

  return "none";
}
