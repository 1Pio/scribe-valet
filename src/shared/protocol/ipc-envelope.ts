export const IPC_PROTOCOL_ID = "sv-ipc" as const;
export const protocolVersion = 1 as const;

export const IPC_CHANNELS = {
  HANDSHAKE_INIT: "runtime:handshake:init",
  HANDSHAKE_ACK: "runtime:handshake:ack",
  RUNTIME_PING: "runtime:ping",
  RUNTIME_GET_STATUS: "runtime:get-status",
  RUNTIME_STATUS_CHANGED: "runtime:status:changed",
  RUNTIME_FIX_NOW: "runtime:fix-now",
  RUNTIME_RETRY: "runtime:retry",
  RUNTIME_RESTART_APP: "runtime:restart-app",
  RUNTIME_COPY_REPORT: "runtime:copy-report",
  RUNTIME_TRUST_GET: "runtime:trust:get",
  RUNTIME_TRUST_RETRY: "runtime:trust:retry",
  RUNTIME_TRUST_COPY_REPORT: "runtime:trust:copy-report"
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type IpcEnvelope<TPayload> = {
  protocolId: typeof IPC_PROTOCOL_ID;
  protocolVersion: typeof protocolVersion;
  channel: IpcChannel;
  requestId: string;
  sentAtMs: number;
  payload: TPayload;
};

type EnvelopeInput<TPayload> = {
  channel: IpcChannel;
  requestId: string;
  payload: TPayload;
};

export function createEnvelope<TPayload>({
  channel,
  requestId,
  payload
}: EnvelopeInput<TPayload>): IpcEnvelope<TPayload> {
  return {
    protocolId: IPC_PROTOCOL_ID,
    protocolVersion,
    channel,
    requestId,
    sentAtMs: Date.now(),
    payload
  };
}
