import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../shared/protocol/ipc-envelope";
import { createRuntimeTrustBridge } from "./runtime-trust-bridge";

describe("runtime trust bridge", () => {
  it("invokes get status channel", async () => {
    const invoke = vi.fn().mockResolvedValue({ status: "verified" });
    const bridge = createRuntimeTrustBridge({ invoke });

    await bridge.getStatus();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.RUNTIME_TRUST_GET);
  });

  it("invokes retry and copy channels", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: "unconfirmed" })
      .mockResolvedValueOnce({ ok: true, report: "report text" });
    const bridge = createRuntimeTrustBridge({ invoke });

    await bridge.retry();
    await bridge.copyReport();

    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.RUNTIME_TRUST_RETRY);
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.RUNTIME_TRUST_COPY_REPORT
    );
  });
});
