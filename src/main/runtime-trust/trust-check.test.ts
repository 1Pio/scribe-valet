import { describe, expect, it } from "vitest";
import { RUNTIME_TRUST_STATUS } from "../../shared/protocol/runtime-trust";
import { evaluateRuntimeTrust } from "./trust-check";

describe("evaluateRuntimeTrust", () => {
  it("returns verified when all runtime signals pass", () => {
    const result = evaluateRuntimeTrust({
      guardrailCheckPassed: true,
      localPortFindings: [],
      appMetrics: [{ pid: 100, type: "Browser", serviceName: "main" }],
      checkedAt: new Date("2026-02-16T00:00:00.000Z")
    });

    expect(result.status).toBe(RUNTIME_TRUST_STATUS.VERIFIED);
    expect(result.summary).toBe("No local ports detected");
    expect(result.details.checkedAtIso).toBe("2026-02-16T00:00:00.000Z");
    expect(result.details.checks.every((entry) => entry.passed)).toBe(true);
  });

  it("returns unconfirmed when evidence is incomplete", () => {
    const result = evaluateRuntimeTrust({
      guardrailCheckPassed: true,
      localPortFindings: [],
      appMetrics: []
    });

    expect(result.status).toBe(RUNTIME_TRUST_STATUS.UNCONFIRMED);
    expect(result.summary).toContain("unconfirmed");
    expect(result.details.checks.some((entry) => !entry.passed)).toBe(true);
  });

  it("returns unconfirmed when local findings exist", () => {
    const result = evaluateRuntimeTrust({
      guardrailCheckPassed: true,
      localPortFindings: ["127.0.0.1:9000"],
      appMetrics: [{ pid: 400, type: "Utility" }]
    });

    expect(result.status).toBe(RUNTIME_TRUST_STATUS.UNCONFIRMED);
    expect(result.details.findings).toEqual(["127.0.0.1:9000"]);
  });
});
