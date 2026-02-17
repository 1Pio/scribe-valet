import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ModelLifecycleSnapshot } from "../../shared/types/model-lifecycle";
import { DownloadBundleModal, shouldShowDownloadDialog } from "./DownloadBundleModal";

describe("DownloadBundleModal", () => {
  it("renders one-time bundle confirmation with explicit percent lines", () => {
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
      />
    );

    expect(html).toContain("Download required AI model bundle");
    expect(html).toContain("Location:");
    expect(html).toContain("C:/models");
    expect(html).toContain("Speech - 14% (downloading)");
    expect(html).toContain("Confirm bundle download");
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
