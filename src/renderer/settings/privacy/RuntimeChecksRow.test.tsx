import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RUNTIME_TRUST_STATUS, type RuntimeTrustSnapshot } from "../../../shared/protocol/runtime-trust";
import { RuntimeChecksRow } from "./RuntimeChecksRow";

function buildSnapshot(status: RuntimeTrustSnapshot["status"]): RuntimeTrustSnapshot {
  return {
    status,
    headline: status === RUNTIME_TRUST_STATUS.VERIFIED ? "Runs locally on your device" : "Local runtime needs another check",
    summary:
      status === RUNTIME_TRUST_STATUS.VERIFIED
        ? "No local ports detected"
        : "Trust status is unconfirmed. You can retry checks and continue using local features.",
    details: {
      checkedAtIso: "2026-02-16T00:00:00.000Z",
      checks: [
        {
          name: "No-localhost guardrail",
          passed: status === RUNTIME_TRUST_STATUS.VERIFIED,
          detail: "Runtime source scan completed."
        }
      ],
      processes: [{ pid: 20, type: "Browser", serviceName: "main" }],
      findings: []
    },
    report: "report"
  };
}

describe("RuntimeChecksRow", () => {
  it("shows verified summary with details and copy report", () => {
    const html = renderToStaticMarkup(
      <RuntimeChecksRow
        trustSnapshot={buildSnapshot(RUNTIME_TRUST_STATUS.VERIFIED)}
        onRetry={vi.fn()}
        onCopyReport={vi.fn()}
      />
    );

    expect(html).toContain("Runtime checks");
    expect(html).toContain("No local ports detected");
    expect(html).toContain("Details");
    expect(html).toContain("Copy report");
  });

  it("shows unconfirmed state with retry and availability message", () => {
    const html = renderToStaticMarkup(
      <RuntimeChecksRow
        trustSnapshot={buildSnapshot(RUNTIME_TRUST_STATUS.UNCONFIRMED)}
        onRetry={vi.fn()}
        onCopyReport={vi.fn()}
      />
    );

    expect(html).toContain("Runtime trust is unconfirmed");
    expect(html).toContain("Retry");
    expect(html).toContain("local dictation and assistant remain available");
    expect(html).toContain("Details");
  });
});
