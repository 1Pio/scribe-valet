export const IPC_PROTOCOL_ID = "sv-ipc" as const;
export const protocolVersion = 1 as const;

export const IPC_CHANNELS = {
  HANDSHAKE_INIT: "runtime:handshake:init",
  HANDSHAKE_ACK: "runtime:handshake:ack",
  RUNTIME_PING: "runtime:ping"
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
