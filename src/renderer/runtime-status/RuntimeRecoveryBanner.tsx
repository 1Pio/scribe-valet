import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { RuntimeStatus } from "../../shared/types/runtime-status";
import { mapRuntimeStatusToBannerModel } from "./runtime-state-machine";

type RuntimeRecoveryBannerProps = {
  runtimeStatus: RuntimeStatus;
  isVoiceActive: boolean;
  onTryAgain: () => void;
  onRestartApp: () => void;
};

export function RuntimeRecoveryBanner({
  runtimeStatus,
  isVoiceActive,
  onTryAgain,
  onRestartApp
}: RuntimeRecoveryBannerProps): ReactElement | null {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const model = useMemo(
    () => mapRuntimeStatusToBannerModel(runtimeStatus, { isVoiceActive }),
    [runtimeStatus, isVoiceActive]
  );

  useEffect(() => {
    if (!model.showDetails) {
      setDetailsVisible(false);
    }
  }, [model.showDetails]);

  if (!model.visible) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      aria-label="Runtime recovery"
      style={{
        border: "1px solid #f3c777",
        background: "#fff9ee",
        borderRadius: "0.75rem",
        padding: "0.75rem 1rem",
        marginBottom: "1rem"
      }}
    >
      <strong>{model.title}</strong>
      {model.summary ? <p>{model.summary}</p> : null}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        {model.showRestartApp && model.prioritizeRestartApp ? (
          <button onClick={onRestartApp}>Restart app</button>
        ) : null}
        {model.showTryAgain ? <button onClick={onTryAgain}>Try again</button> : null}
        {model.showRestartApp && !model.prioritizeRestartApp ? (
          <button onClick={onRestartApp}>Restart app</button>
        ) : null}
        {model.showDetails ? (
          <button
            onClick={() => {
              setDetailsVisible((current) => !current);
            }}
          >
            Show details
          </button>
        ) : null}
      </div>

      {model.showDetails && detailsVisible ? <p>{model.details}</p> : null}
    </section>
  );
}
