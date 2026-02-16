import { clipboard } from "electron";
import { IPC_CHANNELS } from "../../shared/protocol/ipc-envelope";
import {
  type RuntimeTrustCopyResult,
  type RuntimeTrustSnapshot
} from "../../shared/protocol/runtime-trust";
import { evaluateRuntimeTrust } from "../runtime-trust/trust-check";
import { buildTrustReport } from "../runtime-trust/trust-report";

type ProcessMetricLike = {
  pid?: number;
  type?: string;
  name?: string;
  serviceName?: string;
};

type RuntimeTrustProbe = {
  guardrailCheckPassed: boolean;
  localPortFindings: string[];
  appMetrics: ProcessMetricLike[];
};

type RuntimeTrustControllerDeps = {
  probeTrustEvidence: () => Promise<RuntimeTrustProbe>;
  writeClipboardText?: (value: string) => void;
};

type IpcMainLike = {
  handle: (
    channel: string,
    listener: (_event: unknown, ...args: unknown[]) => unknown
  ) => void;
};

export function createRuntimeTrustController({
  probeTrustEvidence,
  writeClipboardText = (value: string) => clipboard.writeText(value)
}: RuntimeTrustControllerDeps) {
  let latestSnapshot: RuntimeTrustSnapshot | null = null;

  const refresh = async (): Promise<RuntimeTrustSnapshot> => {
    const evidence = await probeTrustEvidence();
    const trustResult = evaluateRuntimeTrust(evidence);
    const reportlessSnapshot: RuntimeTrustSnapshot = {
      ...trustResult,
      report: ""
    };

    const report = buildTrustReport(reportlessSnapshot);
    latestSnapshot = { ...reportlessSnapshot, report };

    return latestSnapshot;
  };

  return {
    async getSnapshot(): Promise<RuntimeTrustSnapshot> {
      if (latestSnapshot) {
        return latestSnapshot;
      }

      return refresh();
    },
    retryTrustCheck: refresh,
    async copyReport(): Promise<RuntimeTrustCopyResult> {
      const snapshot = await this.getSnapshot();
      writeClipboardText(snapshot.report);

      return {
        ok: true,
        report: snapshot.report
      };
    }
  };
}

export function registerRuntimeTrustController(
  ipcMain: IpcMainLike,
  deps: RuntimeTrustControllerDeps
): void {
  const controller = createRuntimeTrustController(deps);

  ipcMain.handle(IPC_CHANNELS.RUNTIME_TRUST_GET, async () => {
    return controller.getSnapshot();
  });

  ipcMain.handle(IPC_CHANNELS.RUNTIME_TRUST_RETRY, async () => {
    return controller.retryTrustCheck();
  });

  ipcMain.handle(IPC_CHANNELS.RUNTIME_TRUST_COPY_REPORT, async () => {
    return controller.copyReport();
  });
}
