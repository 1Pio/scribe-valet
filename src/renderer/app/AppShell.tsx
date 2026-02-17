import { useEffect, useState, type ReactElement } from "react";
import { createIdleRuntimeStatus, type RuntimeStatus } from "../../shared/types/runtime-status";
import type { ModelLifecycleBridge } from "../../preload/model-lifecycle-bridge";
import { ReadinessGate } from "../model-lifecycle/ReadinessGate";
import { MismatchRecoveryPanel } from "../runtime-status/MismatchRecoveryPanel";
import { RuntimeRecoveryBanner } from "../runtime-status/RuntimeRecoveryBanner";

type RuntimeRestartAppResult = {
  ok: true;
  action: "relaunch-intent";
};

type RuntimeStatusBridge = {
  getStatus: () => Promise<RuntimeStatus>;
  onStatusChanged: (listener: (status: RuntimeStatus) => void) => () => void;
  fixNow: () => Promise<RuntimeStatus>;
  tryAgain: () => Promise<RuntimeStatus>;
  restartApp: () => Promise<RuntimeRestartAppResult>;
  copyReport: () => Promise<{ ok: boolean; report: string }>;
};

type AppShellProps = {
  runtimeStatusBridge: RuntimeStatusBridge;
  modelLifecycleBridge: ModelLifecycleBridge;
  isVoiceActive: boolean;
  children: ReactElement;
};

export function AppShell({
  runtimeStatusBridge,
  modelLifecycleBridge,
  isVoiceActive,
  children
}: AppShellProps): ReactElement {
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(
    createIdleRuntimeStatus()
  );

  useEffect(() => {
    let disposed = false;

    const load = async (): Promise<void> => {
      const status = await runtimeStatusBridge.getStatus();
      if (!disposed) {
        setRuntimeStatus(status);
      }
    };

    void load();

    const unsubscribe = runtimeStatusBridge.onStatusChanged((nextStatus) => {
      if (!disposed) {
        setRuntimeStatus(nextStatus);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [runtimeStatusBridge]);

  const runStatusAction = (action: () => Promise<RuntimeStatus>): void => {
    void action().then((nextStatus) => {
      setRuntimeStatus(nextStatus);
    });
  };

  return (
    <>
      <MismatchRecoveryPanel
        runtimeStatus={runtimeStatus}
        onFixNow={() => {
          runStatusAction(() => runtimeStatusBridge.fixNow());
        }}
        onTryAgain={() => {
          runStatusAction(() => runtimeStatusBridge.tryAgain());
        }}
        onRestartApp={() => {
          void runtimeStatusBridge.restartApp();
        }}
        onCopyReport={() => {
          void runtimeStatusBridge.copyReport();
        }}
      />
      <RuntimeRecoveryBanner
        runtimeStatus={runtimeStatus}
        isVoiceActive={isVoiceActive}
        onTryAgain={() => {
          runStatusAction(() => runtimeStatusBridge.tryAgain());
        }}
        onRestartApp={() => {
          void runtimeStatusBridge.restartApp();
        }}
      />
      <ReadinessGate modelLifecycleBridge={modelLifecycleBridge}>{children}</ReadinessGate>
    </>
  );
}
