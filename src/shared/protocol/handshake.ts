import {
  IPC_CHANNELS,
  createEnvelope,
  type IpcEnvelope
} from "./ipc-envelope";

export type HandshakeRequestPayload = {
  appVersion: string;
  rendererVersion: string;
  capabilities: string[];
};

export type HandshakeResponsePayload = {
  accepted: boolean;
  reason: "ok" | "protocol-mismatch";
  capabilities: string[];
};

export type HandshakeRequestEnvelope = IpcEnvelope<HandshakeRequestPayload>;
export type HandshakeResponseEnvelope = IpcEnvelope<HandshakeResponsePayload>;

export function createHandshakeRequest(
  payload: HandshakeRequestPayload,
  requestId: string
): HandshakeRequestEnvelope {
  return createEnvelope({
    channel: IPC_CHANNELS.HANDSHAKE_INIT,
    requestId,
    payload
  });
}

export function createHandshakeResponse(
  payload: HandshakeResponsePayload,
  requestId: string
): HandshakeResponseEnvelope {
  return createEnvelope({
    channel: IPC_CHANNELS.HANDSHAKE_ACK,
    requestId,
    payload
  });
}

export function isHandshakeRequestPayload(
  value: unknown
): value is HandshakeRequestPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<HandshakeRequestPayload>;
  const hasVersions =
    typeof candidate.appVersion === "string" &&
    typeof candidate.rendererVersion === "string";
  const hasCapabilities =
    Array.isArray(candidate.capabilities) &&
    candidate.capabilities.every((entry) => typeof entry === "string");

  return hasVersions && hasCapabilities;
}
