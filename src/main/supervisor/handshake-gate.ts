import { valid, satisfies } from "semver";
import {
  isWorkerHandshakeHelloPayload,
  type WorkerHandshakeHelloPayload
} from "../../shared/protocol/handshake";
import { IPC_PROTOCOL_ID, protocolVersion } from "../../shared/protocol/ipc-envelope";

export type HandshakeDiagnostics = {
  expectedProtocolId: string;
  expectedProtocolVersion: number;
  expectedWorkerVersionRange: string;
  installedProtocolId: string;
  installedProtocolVersion: number;
  installedWorkerVersion: string;
};

export type HandshakeAcceptance =
  | {
      accepted: true;
      diagnostics: HandshakeDiagnostics;
      capabilities: string[];
    }
  | {
      accepted: false;
      reason: "protocol-mismatch" | "version-mismatch" | "invalid-handshake";
      diagnostics: HandshakeDiagnostics;
    };

const DEFAULT_WORKER_VERSION_RANGE = "^0.1.0";

function baseDiagnostics(): HandshakeDiagnostics {
  return {
    expectedProtocolId: IPC_PROTOCOL_ID,
    expectedProtocolVersion: protocolVersion,
    expectedWorkerVersionRange: DEFAULT_WORKER_VERSION_RANGE,
    installedProtocolId: "unknown",
    installedProtocolVersion: -1,
    installedWorkerVersion: "unknown"
  };
}

function asDiagnostics(payload: WorkerHandshakeHelloPayload): HandshakeDiagnostics {
  return {
    expectedProtocolId: IPC_PROTOCOL_ID,
    expectedProtocolVersion: protocolVersion,
    expectedWorkerVersionRange: DEFAULT_WORKER_VERSION_RANGE,
    installedProtocolId: payload.protocolId,
    installedProtocolVersion: payload.protocolVersion,
    installedWorkerVersion: payload.workerVersion
  };
}

export function acceptHandshake(payload: unknown): HandshakeAcceptance {
  if (!isWorkerHandshakeHelloPayload(payload)) {
    return {
      accepted: false,
      reason: "invalid-handshake",
      diagnostics: baseDiagnostics()
    };
  }

  const diagnostics = asDiagnostics(payload);
  const protocolMatches =
    payload.protocolId === IPC_PROTOCOL_ID &&
    payload.protocolVersion === protocolVersion;

  if (!protocolMatches) {
    return {
      accepted: false,
      reason: "protocol-mismatch",
      diagnostics
    };
  }

  const workerVersion = valid(payload.workerVersion);
  if (!workerVersion || !satisfies(workerVersion, DEFAULT_WORKER_VERSION_RANGE)) {
    return {
      accepted: false,
      reason: "version-mismatch",
      diagnostics
    };
  }

  return {
    accepted: true,
    diagnostics,
    capabilities: payload.capabilities
  };
}
