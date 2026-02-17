import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ModelLifecycleSnapshot } from "../../shared/types/model-lifecycle";
import { DownloadBundleModal, shouldShowDownloadDialog } from "./DownloadBundleModal";

describe("DownloadBundleModal", () => {
  it("renders one-time bundle confirmation with pending artifact list", () => {
    const html = renderToStaticMarkup(
      <DownloadBundleModal
        snapshot={createSnapshot({
          downloadConfirmation: {
            required: true,
            confirmedAtMs: null
          },
          downloadProgress: [
            {
              artifactId: "stt",
              label: "Speech model",
              percent: 14,
              bytesDownloaded: 14,
              bytesTotal: 100,
              status: "downloading"
            }
          ],
          artifacts: [
            {
              capability: "stt",
              artifactId: "stt",
              displayName: "Speech",
              isAvailable: false,
              issue: "missing-file"
            }
          ]
        })}
        installPath="C:/models"
        onConfirm={vi.fn()}
        onChangePath={vi.fn()}
      />
    );

    expect(html).toContain("Download required AI model bundle");
    expect(html).toContain("Location:");
    expect(html).toContain("C:/models");
    expect(html).toContain("Edit download location");
    expect(html).toContain("Missing required artifacts will download after you confirm");
    expect(html).toContain("Speech");
    expect(html).not.toContain("14% (downloading)");
    expect(html).toContain("Confirm bundle download");
  });

  it("renders full bundle status for all artifacts and percent only for active download", () => {
    const html = renderToStaticMarkup(
      <DownloadBundleModal
        snapshot={createSnapshot({
          state: "downloading",
          downloadConfirmation: {
            required: false,
            confirmedAtMs: 1
          },
          downloadProgress: [
            {
              artifactId: "stt",
              label: "Speech model",
              percent: 14,
              bytesDownloaded: 14,
              bytesTotal: 100,
              status: "downloading"
            },
            {
              artifactId: "llm",
              label: "Assistant model",
              percent: 100,
              bytesDownloaded: 100,
              bytesTotal: 100,
              status: "complete"
            },
            {
              artifactId: "tts",
              label: "Voice model",
              percent: 0,
              bytesDownloaded: 0,
              bytesTotal: 100,
              status: "pending"
            }
          ],
          artifacts: [
            {
              capability: "stt",
              artifactId: "stt",
              displayName: "Speech",
              isAvailable: false,
              issue: "missing-file"
            },
            {
              capability: "llm",
              artifactId: "llm",
              displayName: "Assistant",
              isAvailable: true,
              issue: "missing-file"
            },
            {
              capability: "tts",
              artifactId: "tts",
              displayName: "Voice",
              isAvailable: false,
              issue: "missing-file"
            }
          ]
        })}
        installPath="C:/models"
        onConfirm={vi.fn()}
        onChangePath={vi.fn()}
      />
    );

    expect(html).toContain("Bundle status (all required artifacts):");
    expect(html).toContain("Speech - downloading (14%)");
    expect(html).toContain("Assistant - verified");
    expect(html).toContain("Voice - pending");
    expect(html).not.toContain("Assistant - verified (100%)");
  });

  it("keeps storage and diagnostics controls visible while gate blocks app shell", () => {
    const html = renderToStaticMarkup(
      <DownloadBundleModal
        snapshot={createSnapshot({
          state: "downloading",
          downloadConfirmation: {
            required: false,
            confirmedAtMs: 1
          },
          artifacts: [
            {
              capability: "stt",
              artifactId: "stt",
              displayName: "Speech",
              isAvailable: false,
              issue: "missing-file"
            }
          ]
        })}
        installPath="C:/models"
        onConfirm={vi.fn()}
        onChangePath={vi.fn()}
        onCopyDiagnostics={vi.fn()}
      />
    );

    expect(html).toContain("Downloading AI model bundle");
    expect(html).toContain("Edit download location");
    expect(html).toContain("Show/Copy diagnostics report");
  });

  it("shows inline location editor when editing is active", () => {
    const html = renderToStaticMarkup(
      <DownloadBundleModal
        snapshot={createSnapshot({
          downloadConfirmation: {
            required: true,
            confirmedAtMs: null
          }
        })}
        installPath="C:/models"
        onConfirm={vi.fn()}
        onChangePath={vi.fn()}
        initialPathEditing={true}
      />
    );

    expect(html).toContain("Model location");
    expect(html).toContain("download-modal-path-input");
    expect(html).toContain("Apply location");
    expect(html).toContain("Missing directories are created automatically");
  });

  it("tracks whether download dialog should be shown", () => {
    expect(
      shouldShowDownloadDialog(
        createSnapshot({
          downloadConfirmation: { required: true, confirmedAtMs: null }
        })
      )
    ).toBe(true);
    expect(shouldShowDownloadDialog(createSnapshot({ state: "ready" }))).toBe(false);
  });
});

function createSnapshot(overrides: Partial<ModelLifecycleSnapshot>): ModelLifecycleSnapshot {
  return {
    state: "degraded",
    updatedAtMs: 1,
    steps: [],
    banner: {
      thresholdMs: 3000,
      startedAtMs: 0,
      isVisible: false,
      escalatedAtMs: null
    },
    setupReason: null,
    modeAvailability: {
      assistant: {
        mode: "assistant",
        status: "blocked",
        summary: "Assistant is blocked.",
        blockedBy: ["llm"]
      },
      dictation: {
        mode: "dictation",
        status: "degraded",
        summary: "Dictation remains available.",
        blockedBy: []
      }
    },
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
      summary: "summary",
      generatedAtMs: 0,
      lines: []
    },
    ...overrides
  };
}
