import { useEffect, useState, type ReactElement } from "react";
import { createIdleRuntimeStatus, type RuntimeStatus } from "../../shared/types/runtime-status";
import { RuntimeRecoveryBanner } from "../runtime-status/RuntimeRecoveryBanner";

type RuntimeStatusBridge = {
  getStatus: () => Promise<RuntimeStatus>;
  onStatusChanged: (listener: (status: RuntimeStatus) => void) => () => void;
  tryAgain: () => Promise<RuntimeStatus>;
  restartApp: () => Promise<RuntimeStatus>;
};

type AppShellProps = {
  runtimeStatusBridge: RuntimeStatusBridge;
  isVoiceActive: boolean;
  children: ReactElement;
};

export function AppShell({
  runtimeStatusBridge,
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

  return (
    <>
      <RuntimeRecoveryBanner
        runtimeStatus={runtimeStatus}
        isVoiceActive={isVoiceActive}
        onTryAgain={() => {
          void runtimeStatusBridge.tryAgain().then(setRuntimeStatus);
        }}
        onRestartApp={() => {
          void runtimeStatusBridge.restartApp().then(setRuntimeStatus);
        }}
      />
      {children}
    </>
  );
}
