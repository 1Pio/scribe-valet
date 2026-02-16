import { useMemo, type ReactElement } from "react";
import type { RuntimeStatus } from "../../shared/types/runtime-status";
import { mapRuntimeStatusToMismatchModel } from "./runtime-state-machine";

type MismatchRecoveryPanelProps = {
  runtimeStatus: RuntimeStatus;
  onFixNow: () => void;
  onTryAgain: () => void;
  onRestartApp: () => void;
  onCopyReport: () => void;
};

export function MismatchRecoveryPanel({
  runtimeStatus,
  onFixNow,
  onTryAgain,
  onRestartApp,
  onCopyReport
}: MismatchRecoveryPanelProps): ReactElement | null {
  const model = useMemo(() => mapRuntimeStatusToMismatchModel(runtimeStatus), [runtimeStatus]);

  if (model === null || !model.visible) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      aria-label="Version mismatch recovery"
      style={{
        border: "1px solid #f3c777",
        background: "#fff9ee",
        borderRadius: "0.75rem",
        padding: "0.75rem 1rem",
        marginBottom: "1rem"
      }}
    >
      <strong>{model.summary}</strong>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button onClick={onFixNow}>Fix now</button>
        <button onClick={onTryAgain}>Try again</button>
        {model.showRestartApp ? <button onClick={onRestartApp}>Restart app</button> : null}
      </div>

      <details style={{ marginTop: "0.5rem" }}>
        <summary>{model.detailsTitle}</summary>
        <p>Expected: {model.expectedVersion}</p>
        <p>Installed: {model.installedVersion}</p>
        <button onClick={onCopyReport}>Copy report</button>
      </details>
    </section>
  );
}
