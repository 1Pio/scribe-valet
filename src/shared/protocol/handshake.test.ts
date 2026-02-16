import { describe, expect, it } from "vitest";
import {
  createHandshakeRequest,
  createHandshakeResponse,
  isHandshakeRequestPayload
} from "./handshake";
import { IPC_CHANNELS, IPC_PROTOCOL_ID, protocolVersion } from "./ipc-envelope";

describe("handshake protocol", () => {
  it("creates a versioned handshake request envelope", () => {
    const request = createHandshakeRequest(
      {
        appVersion: "1.2.3",
        rendererVersion: "1.2.3",
        capabilities: ["runtime:ping", "runtime:status"]
      },
      "req-1"
    );

    expect(request.protocolId).toBe(IPC_PROTOCOL_ID);
    expect(request.protocolVersion).toBe(protocolVersion);
    expect(request.channel).toBe(IPC_CHANNELS.HANDSHAKE_INIT);
    expect(request.requestId).toBe("req-1");
    expect(request.payload.capabilities).toEqual(["runtime:ping", "runtime:status"]);
  });

  it("creates a versioned handshake response envelope", () => {
    const response = createHandshakeResponse(
      {
        accepted: true,
        reason: "ok",
        capabilities: ["runtime:ping"]
      },
      "req-2"
    );

    expect(response.protocolId).toBe(IPC_PROTOCOL_ID);
    expect(response.protocolVersion).toBe(protocolVersion);
    expect(response.channel).toBe(IPC_CHANNELS.HANDSHAKE_ACK);
    expect(response.payload.reason).toBe("ok");
  });

  it("validates handshake request payload shape", () => {
    expect(
      isHandshakeRequestPayload({
        appVersion: "1.0.0",
        rendererVersion: "1.0.0",
        capabilities: ["runtime:ping"]
      })
    ).toBe(true);

    expect(
      isHandshakeRequestPayload({
        appVersion: "1.0.0",
        rendererVersion: 100,
        capabilities: ["runtime:ping"]
      })
    ).toBe(false);
  });
});
