import type { ReactElement } from "react";
import {
  RUNTIME_TRUST_STATUS,
  type RuntimeTrustSnapshot
} from "../../../shared/protocol/runtime-trust";

type RuntimeChecksRowProps = {
  trustSnapshot: RuntimeTrustSnapshot;
  onRetry: () => void;
  onCopyReport: () => void;
};

export function getRuntimeChecksSummary(status: RuntimeTrustSnapshot["status"]): string {
  if (status === RUNTIME_TRUST_STATUS.VERIFIED) {
    return "No local ports detected";
  }

  return "Runtime trust is unconfirmed";
}

export function RuntimeChecksRow({
  trustSnapshot,
  onRetry,
  onCopyReport
}: RuntimeChecksRowProps): ReactElement {
  const isUnconfirmed = trustSnapshot.status === RUNTIME_TRUST_STATUS.UNCONFIRMED;
  const summaryText = getRuntimeChecksSummary(trustSnapshot.status);

  return (
    <section aria-label="Runtime checks" style={{ border: "1px solid #d8d8d8", padding: "1rem", borderRadius: "0.75rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center" }}>
        <strong>Runtime checks</strong>
        <span>{summaryText}</span>
      </header>

      {isUnconfirmed ? (
        <p role="alert">Runtime trust is unconfirmed. Retry checks any time while local dictation and assistant remain available.</p>
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", marginBottom: "0.75rem" }}>
        {isUnconfirmed ? <button onClick={onRetry}>Retry</button> : null}
        <button onClick={onCopyReport}>Copy report</button>
      </div>

      <details>
        <summary>Details</summary>
        <p>{trustSnapshot.headline}</p>
        <p>{trustSnapshot.summary}</p>
        <ul>
          {trustSnapshot.details.checks.map((check) => (
            <li key={check.name}>
              {check.name}: {check.passed ? "pass" : "warn"}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
