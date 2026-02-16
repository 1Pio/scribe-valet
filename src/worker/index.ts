const WORKER_PING_RESPONSE = {
  ok: true,
  from: "worker"
} as const;

const WORKER_CAPABILITIES = ["runtime:ping", "runtime:status"];
const WORKER_VERSION = "0.1.0";

process.parentPort?.on("message", (event) => {
  if (event?.data?.kind === "handshake:init") {
    process.parentPort?.postMessage({
      kind: "handshake:hello",
      payload: {
        protocolId: "sv-ipc",
        protocolVersion: 1,
        workerVersion: WORKER_VERSION,
        capabilities: WORKER_CAPABILITIES
      }
    });
    return;
  }

  if (event?.data?.kind === "runtime:ping") {
    process.parentPort?.postMessage({
      kind: "runtime:pong",
      payload: WORKER_PING_RESPONSE
    });
  }
});
