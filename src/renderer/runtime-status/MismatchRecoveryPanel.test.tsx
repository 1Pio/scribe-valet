import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createIdleRuntimeStatus } from "../../shared/types/runtime-status";
import { MismatchRecoveryPanel } from "./MismatchRecoveryPanel";

describe("MismatchRecoveryPanel", () => {
  it("shows human summary with fix-now path and copy report", () => {
    const html = renderToStaticMarkup(
      <MismatchRecoveryPanel
        runtimeStatus={{
          ...createIdleRuntimeStatus(10),
          state: "mismatch",
          mismatch: {
            reason: "version-mismatch",
            expectedProtocolId: "sv-ipc",
            expectedProtocolVersion: 1,
            expectedWorkerVersionRange: "^0.1.0",
            installedProtocolId: "sv-ipc",
            installedProtocolVersion: 1,
            installedWorkerVersion: "0.2.0"
          }
        }}
        onFixNow={vi.fn()}
        onTryAgain={vi.fn()}
        onRestartApp={vi.fn()}
        onCopyReport={vi.fn()}
      />
    );

    expect(html).toContain("Finishing an update so voice can start.");
    expect(html).toContain("Fix now");
    expect(html).toContain("Try again");
    expect(html).toContain("Restart app");
    expect(html).toContain("Details");
    expect(html).toContain("Expected:");
    expect(html).toContain("Installed:");
    expect(html).toContain("Copy report");
  });

  it("hides restart fallback for invalid handshake mismatches", () => {
    const html = renderToStaticMarkup(
      <MismatchRecoveryPanel
        runtimeStatus={{
          ...createIdleRuntimeStatus(10),
          state: "mismatch",
          mismatch: {
            reason: "invalid-handshake",
            expectedProtocolId: "sv-ipc",
            expectedProtocolVersion: 1,
            expectedWorkerVersionRange: "^0.1.0",
            installedProtocolId: "sv-ipc",
            installedProtocolVersion: 1,
            installedWorkerVersion: "0.1.0"
          }
        }}
        onFixNow={vi.fn()}
        onTryAgain={vi.fn()}
        onRestartApp={vi.fn()}
        onCopyReport={vi.fn()}
      />
    );

    expect(html).toContain("Refreshing voice setup and trying again.");
    expect(html).not.toContain("Restart app");
  });
});
