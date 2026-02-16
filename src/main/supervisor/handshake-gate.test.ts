import { describe, expect, it } from "vitest";
import { acceptHandshake } from "./handshake-gate";

describe("handshake gate", () => {
  it("accepts compatible protocol and worker versions", () => {
    const result = acceptHandshake({
      protocolId: "sv-ipc",
      protocolVersion: 1,
      workerVersion: "0.1.4",
      capabilities: ["runtime:ping", "runtime:status"]
    });

    expect(result.accepted).toBe(true);
    if (result.accepted) {
      expect(result.capabilities).toEqual(["runtime:ping", "runtime:status"]);
      expect(result.diagnostics.expectedWorkerVersionRange).toBe("^0.1.0");
    }
  });

  it("rejects protocol mismatches with diagnostics", () => {
    const result = acceptHandshake({
      protocolId: "sv-ipc",
      protocolVersion: 2,
      workerVersion: "0.1.2",
      capabilities: []
    });

    expect(result).toMatchObject({
      accepted: false,
      reason: "protocol-mismatch"
    });

    if (!result.accepted) {
      expect(result.diagnostics).toMatchObject({
        expectedProtocolId: "sv-ipc",
        expectedProtocolVersion: 1,
        installedProtocolVersion: 2
      });
    }
  });

  it("rejects version mismatches using semver", () => {
    const result = acceptHandshake({
      protocolId: "sv-ipc",
      protocolVersion: 1,
      workerVersion: "0.2.0",
      capabilities: ["runtime:ping"]
    });

    expect(result).toMatchObject({
      accepted: false,
      reason: "version-mismatch"
    });

    if (!result.accepted) {
      expect(result.diagnostics).toMatchObject({
        expectedWorkerVersionRange: "^0.1.0",
        installedWorkerVersion: "0.2.0"
      });
    }
  });

  it("rejects malformed handshakes", () => {
    const result = acceptHandshake({
      protocolId: "sv-ipc",
      protocolVersion: 1,
      workerVersion: "0.1.0"
    });

    expect(result).toMatchObject({
      accepted: false,
      reason: "invalid-handshake"
    });
  });
});
