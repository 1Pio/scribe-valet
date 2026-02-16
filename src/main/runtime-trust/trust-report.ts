import { type RuntimeTrustSnapshot } from "../../shared/protocol/runtime-trust";

export function buildTrustReport(snapshot: RuntimeTrustSnapshot): string {
  const checkLines = snapshot.details.checks.map((check) => {
    const mark = check.passed ? "PASS" : "WARN";
    return `- [${mark}] ${check.name}: ${check.detail}`;
  });

  const processLines = snapshot.details.processes.map(
    (processInfo) =>
      `- pid=${processInfo.pid} type=${processInfo.type} name=${processInfo.name ?? "n/a"} service=${processInfo.serviceName ?? "n/a"}`
  );

  const findingLines =
    snapshot.details.findings.length === 0
      ? ["- none"]
      : snapshot.details.findings.map((finding) => `- ${finding}`);

  return [
    "Scribe-Valet Runtime Trust Report",
    `Status: ${snapshot.status}`,
    `Headline: ${snapshot.headline}`,
    `Summary: ${snapshot.summary}`,
    `Checked: ${snapshot.details.checkedAtIso}`,
    "",
    "Checks:",
    ...checkLines,
    "",
    "Findings:",
    ...findingLines,
    "",
    "Processes:",
    ...processLines
  ].join("\n");
}
