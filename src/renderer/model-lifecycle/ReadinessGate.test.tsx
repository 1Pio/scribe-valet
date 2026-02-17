import { describe, expect, it } from "vitest";
import type { ModelLifecycleSnapshot } from "../../shared/types/model-lifecycle";
import { deriveDialogState, getModeAvailabilityNotice, shouldBlockNormalFlow } from "./ReadinessGate";

describe("ReadinessGate helpers", () => {
  it("blocks normal app flow for setup-required and recovery-required states", () => {
    expect(shouldBlockNormalFlow(createSnapshot("setup-required"))).toBe(true);
    expect(shouldBlockNormalFlow(createSnapshot("recovery-required"))).toBe(true);
    expect(shouldBlockNormalFlow(createSnapshot("degraded"))).toBe(false);
  });

  it("shows mode-specific degradation notice when dictation remains usable", () => {
    const notice = getModeAvailabilityNotice(
      createSnapshot("degraded", {
        modeAvailability: {
          assistant: {
            mode: "assistant",
            status: "blocked",
            summary: "Assistant is blocked until STT, LLM, and TTS are all available.",
            blockedBy: ["llm", "tts"]
          },
          dictation: {
            mode: "dictation",
            status: "degraded",
            summary: "Dictation is available with raw output because Assistant models are unavailable.",
            blockedBy: []
          }
        }
      }).modeAvailability
    );

    expect(notice).toContain("Dictation is available with raw output");
    expect(notice).toContain("Assistant remains blocked");
  });

  it("prioritizes a single active dialog state", () => {
    const downloadRequired = createSnapshot("setup-required", {
      downloadConfirmation: {
        required: true,
        confirmedAtMs: null
      }
    });
    expect(deriveDialogState(downloadRequired)).toBe("download");

    const recoveryRequired = createSnapshot("recovery-required", {
      downloadConfirmation: {
        required: false,
        confirmedAtMs: null
      }
    });
    expect(deriveDialogState(recoveryRequired)).toBe("setup");

    expect(deriveDialogState(createSnapshot("ready"))).toBe("none");
  });
});

function createSnapshot(
  state: ModelLifecycleSnapshot["state"],
  overrides: Partial<ModelLifecycleSnapshot> = {}
): ModelLifecycleSnapshot {
  return {
    state,
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
        status: "available",
        summary: "Assistant is fully available.",
        blockedBy: []
      },
      dictation: {
        mode: "dictation",
        status: "available",
        summary: "Dictation is available with AI enrichment.",
        blockedBy: []
      }
    },
    readyToast: {
      enabled: true,
      showOnHealthyStartup: state === "ready"
    },
    downloadConfirmation: {
      required: false,
      confirmedAtMs: null
    },
    downloadProgress: [],
    artifacts: [],
    recoveryActions: [],
    diagnostics: {
      summary: "diagnostics",
      generatedAtMs: 0,
      lines: []
    },
    ...overrides
  };
}
