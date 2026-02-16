import {
  RUNTIME_TRUST_STATUS,
  type RuntimeTrustProcessObservation,
  type RuntimeTrustResult
} from "../../shared/protocol/runtime-trust";

type ProcessMetricLike = {
  pid?: number;
  type?: string;
  name?: string;
  serviceName?: string;
};

export type RuntimeTrustCheckInput = {
  guardrailCheckPassed: boolean;
  localPortFindings: string[];
  appMetrics: ProcessMetricLike[];
  checkedAt?: Date;
};

function normalizeProcesses(
  appMetrics: ProcessMetricLike[]
): RuntimeTrustProcessObservation[] {
  return appMetrics.map((metric) => ({
    pid: typeof metric.pid === "number" ? metric.pid : -1,
    type: typeof metric.type === "string" ? metric.type : "unknown",
    name: typeof metric.name === "string" ? metric.name : undefined,
    serviceName:
      typeof metric.serviceName === "string" ? metric.serviceName : undefined
  }));
}

export function evaluateRuntimeTrust({
  guardrailCheckPassed,
  localPortFindings,
  appMetrics,
  checkedAt = new Date()
}: RuntimeTrustCheckInput): RuntimeTrustResult {
  const checks = [
    {
      name: "No-localhost guardrail",
      passed: guardrailCheckPassed,
      detail: guardrailCheckPassed
        ? "Runtime source scan passed with no localhost patterns."
        : "Runtime source scan failed or has not completed."
    },
    {
      name: "Local port findings",
      passed: localPortFindings.length === 0,
      detail:
        localPortFindings.length === 0
          ? "No local ports detected"
          : `Potential local port indicators found: ${localPortFindings.join(", ")}`
    },
    {
      name: "Electron process metrics",
      passed: appMetrics.length > 0,
      detail:
        appMetrics.length > 0
          ? `Observed ${appMetrics.length} runtime process metrics.`
          : "Process metrics were unavailable during trust evaluation."
    }
  ];

  const allChecksPassed = checks.every((check) => check.passed);
  const status = allChecksPassed
    ? RUNTIME_TRUST_STATUS.VERIFIED
    : RUNTIME_TRUST_STATUS.UNCONFIRMED;

  return {
    status,
    headline:
      status === RUNTIME_TRUST_STATUS.VERIFIED
        ? "Runs locally on your device"
        : "Local runtime needs another check",
    summary:
      status === RUNTIME_TRUST_STATUS.VERIFIED
        ? "No local ports detected"
        : "Trust status is unconfirmed. You can retry checks and continue using local features.",
    details: {
      checkedAtIso: checkedAt.toISOString(),
      checks,
      processes: normalizeProcesses(appMetrics),
      findings: [...localPortFindings]
    }
  };
}
