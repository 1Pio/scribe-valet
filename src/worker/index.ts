const WORKER_PING_RESPONSE = {
  ok: true,
  from: "worker"
} as const;

process.parentPort?.on("message", (event) => {
  if (event?.data?.kind === "runtime:ping") {
    process.parentPort?.postMessage({
      kind: "runtime:pong",
      payload: WORKER_PING_RESPONSE
    });
  }
});
