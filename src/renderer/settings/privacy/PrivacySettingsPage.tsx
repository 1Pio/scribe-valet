import { useEffect, useState, type ReactElement } from "react";
import { RUNTIME_TRUST_STATUS, type RuntimeTrustSnapshot } from "../../../shared/protocol/runtime-trust";
import { RuntimeChecksRow } from "./RuntimeChecksRow";

type RuntimeTrustBridge = {
  getStatus: () => Promise<RuntimeTrustSnapshot>;
  retry: () => Promise<RuntimeTrustSnapshot>;
  copyReport: () => Promise<{ ok: boolean; report: string }>;
};

type PrivacySettingsPageProps = {
  runtimeTrustBridge: RuntimeTrustBridge;
};

const initialTrustSnapshot: RuntimeTrustSnapshot = {
  status: RUNTIME_TRUST_STATUS.UNCONFIRMED,
  headline: "Checking local runtime",
  summary: "Trust checks are loading.",
  details: {
    checkedAtIso: new Date(0).toISOString(),
    checks: [],
    processes: [],
    findings: []
  },
  report: ""
};

export function PrivacySettingsPage({
  runtimeTrustBridge
}: PrivacySettingsPageProps): ReactElement {
  const [trustSnapshot, setTrustSnapshot] =
    useState<RuntimeTrustSnapshot>(initialTrustSnapshot);
  const [copyState, setCopyState] = useState<string>("");

  useEffect(() => {
    let disposed = false;

    const load = async (): Promise<void> => {
      const nextSnapshot = await runtimeTrustBridge.getStatus();
      if (!disposed) {
        setTrustSnapshot(nextSnapshot);
      }
    };

    void load();

    return () => {
      disposed = true;
    };
  }, [runtimeTrustBridge]);

  const handleRetry = async (): Promise<void> => {
    const nextSnapshot = await runtimeTrustBridge.retry();
    setTrustSnapshot(nextSnapshot);
    setCopyState("");
  };

  const handleCopy = async (): Promise<void> => {
    const copyResult = await runtimeTrustBridge.copyReport();
    setCopyState(copyResult.ok ? "Runtime report copied." : "Unable to copy runtime report.");
  };

  return (
    <section>
      <h2>Privacy</h2>
      <RuntimeChecksRow
        trustSnapshot={trustSnapshot}
        onRetry={() => {
          void handleRetry();
        }}
        onCopyReport={() => {
          void handleCopy();
        }}
      />
      {copyState ? <p>{copyState}</p> : null}
    </section>
  );
}
