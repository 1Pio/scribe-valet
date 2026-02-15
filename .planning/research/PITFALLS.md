# Pitfalls Research

**Domain:** Local-first desktop voice dictation + assistant app (offline-first, no open ports)
**Researched:** 2026-02-15
**Confidence:** MEDIUM-HIGH

## Critical Pitfalls

### Pitfall 1: Real-time audio path does non-real-time work

**What goes wrong:**
Audio capture callback or ingest loop does allocation, logging, locks, disk I/O, or IPC, causing buffer underruns and transcript lag spikes.

**Why it happens:**
Teams treat audio callback code like normal app code and forget that callback timing is hard real-time-ish.

**How to avoid:**
Keep capture callback minimal: copy PCM into lock-free/ring buffer only; move VAD/ASR/tooling to worker/utility process; ban malloc/free, file I/O, console I/O, and blocking locks on callback path.

**Warning signs:**
- Crackles/dropouts under CPU load
- Latency jumps only when logs or tool calls fire
- Capture thread occasionally misses deadlines in profiling

**Phase to address:**
Phase 1 - Audio pipeline + latency budget

---

### Pitfall 2: No explicit latency budget and backpressure policy

**What goes wrong:**
Pipeline queues grow (mic -> VAD -> ASR -> postprocess -> assistant), so transcript quality appears fine but appears 2-10s late and worsens over long sessions.

**Why it happens:**
Teams optimize average latency but not p95/p99, and they do not define max queue depths or drop/coalesce strategy.

**How to avoid:**
Define strict per-stage budgets and max queue depth; enforce backpressure policy (drop oldest chunk, coalesce, or degrade model size); expose per-stage timings in trace logs.

**Warning signs:**
- "Works at startup" but degrades after 10-20 minutes
- Memory climbs with active mic
- End-to-end latency grows while per-stage CPU looks stable

**Phase to address:**
Phase 1 - Audio pipeline + latency budget

---

### Pitfall 3: Blocking main/UI process with inference or sync APIs

**What goes wrong:**
UI freezes, hotkeys feel sticky, and app appears unreliable during model load/transcription/tool runs.

**Why it happens:**
Inference, file operations, or sync IPC are executed in Electron main/renderer process.

**How to avoid:**
Run heavy CPU work in utility/worker processes; ban `sendSync` and synchronous fs/process calls on interactive paths; use async IPC (`invoke/handle`) with cancellation timeouts.

**Warning signs:**
- Window becomes unresponsive during model warmup
- DevTools shows long tasks on renderer/main thread
- User actions queue and execute in bursts

**Phase to address:**
Phase 2 - Process architecture and scheduling

---

### Pitfall 4: IPC surface is over-broad and not sender-validated

**What goes wrong:**
Renderer can invoke privileged operations it should not; bugs become security incidents (file read/write, command execution, secret access).

**Why it happens:**
`ipcRenderer` or broad preload APIs are exposed directly; channel namespace is ad hoc; sender/origin validation skipped.

**How to avoid:**
Use narrow, versioned IPC contracts; expose least-privilege preload bridge methods only; validate sender frame for every privileged IPC; keep context isolation and sandbox enabled.

**Warning signs:**
- Preload exports raw IPC methods
- Handlers accept arbitrary payloads without schema validation
- Any renderer can trigger any tool or filesystem action

**Phase to address:**
Phase 2 - IPC contract + security boundary

---

### Pitfall 5: Tool execution is non-deterministic or shell-injectable

**What goes wrong:**
Same utterance triggers different tool plans; command args drift by environment; worst case allows command injection.

**Why it happens:**
No canonical tool schema/versioning, free-form prompts mapped directly to shell commands, no allowlist, and no replayable audit log.

**How to avoid:**
Define strict JSON schemas per tool, explicit allowlists, deterministic planner settings, argument canonicalization, and append-only tool-call logs (request, normalized args, result, duration, exit code).

**Warning signs:**
- Intermittent "works on my machine" tool behavior
- Tool runs differ between identical transcripts
- Shell invocations include user text directly

**Phase to address:**
Phase 3 - Tool runtime and policy engine

---

### Pitfall 6: Offline-first violated by hidden network paths or local servers

**What goes wrong:**
App silently depends on internet/CDNs/telemetry, or opens localhost HTTP endpoints, violating offline and attack-surface requirements.

**Why it happens:**
Desktop wrapper inherits web-era dependencies and convenience servers from sample code.

**How to avoid:**
Ship all critical assets in-app; run in network-deny mode by default; disallow bind/listen sockets; static-scan for network APIs and startup listeners; test full functionality offline.

**Warning signs:**
- First-run hangs without network
- Port listeners appear during runtime
- Fonts/models/config fetched at startup

**Phase to address:**
Phase 0/1 - Baseline constraints + offline acceptance tests

---

### Pitfall 7: Model lifecycle is unmanaged (format, trust, compatibility, disk)

**What goes wrong:**
Huge disk bloat, random "model failed to load" on some machines, unsafe model ingestion, and poor latency due wrong quantization/provider.

**Why it happens:**
No manifest, no checksums/signing, mixed model formats, no compatibility matrix, and no staged download/rollback strategy.

**How to avoid:**
Adopt model registry manifest (`id`, version, checksum, format, min runtime, quantization, memory target); prefer safe serialization formats where possible; verify integrity before activation; keep active+rollback copies only.

**Warning signs:**
- Multiple copies of similar models on disk
- "Works on one GPU/CPU but not another"
- Untrusted model files accepted without verification

**Phase to address:**
Phase 4 - Model manager + artifact governance

---

### Pitfall 8: SQLite reliability assumptions are wrong in WAL mode

**What goes wrong:**
Intermittent `SQLITE_BUSY`, growing `-wal` files, read slowdowns, or data surprises after crashes/power loss.

**Why it happens:**
WAL checkpoint behavior and busy handling are not tuned; long readers starve checkpoints; durability/synchronous tradeoffs misunderstood.

**How to avoid:**
Set explicit busy timeout/handler, track WAL size, schedule checkpoints intentionally, constrain long read transactions, and document durability mode choices per data class.

**Warning signs:**
- WAL file growth over time
- Sporadic lock/busy errors during active dictation
- Long-tail latency spikes on commit

**Phase to address:**
Phase 2/5 - Persistence design + soak testing

---

### Pitfall 9: Threading defaults cause oversubscription and thermal throttling

**What goes wrong:**
Initial performance looks good, then throughput drops, fan noise rises, and latency jitter increases under sustained use.

**Why it happens:**
Inference runtime defaults create too many threads/spin loops for laptop-class CPUs while UI/audio threads compete for cores.

**How to avoid:**
Pin explicit intra/inter-op limits per hardware class; disable thread spinning where latency goals permit; reserve cores for audio/UI path; benchmark 30+ minute sessions, not just short runs.

**Warning signs:**
- High CPU at idle after first inference
- Performance decays over session duration
- Better latency when manually reducing thread count

**Phase to address:**
Phase 5 - Performance tuning + thermal soak

---

### Pitfall 10: Failure domains are not isolated (single-process fragility)

**What goes wrong:**
One model crash or malformed tool response brings down dictation and UI together.

**Why it happens:**
ASR/assistant/tool execution share process and memory without supervisor/restart semantics.

**How to avoid:**
Use process isolation for crash-prone components, supervised restarts with bounded retry, idempotent request IDs, and degraded-mode fallback (dictation-only when assistant fails).

**Warning signs:**
- Entire app exits on model/tool faults
- Recovery requires full app restart
- No per-component health state in logs

**Phase to address:**
Phase 2/5 - Runtime isolation + resilience testing

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single process for UI + ASR + tools | Fast prototype | Freeze-prone, hard fault isolation | Only throwaway spike |
| Raw shell command tools | Rapid feature demos | Injection risk, nondeterminism | Never |
| Auto-download models at runtime without manifest | Faster onboarding | Offline breakage, untraceable failures | Only internal prototype |
| Keep every model revision forever | Easy rollback anxiety relief | Disk bloat, unclear active set | Temporary during migration |
| Default runtime threading settings on all devices | No tuning effort | Thermal/latency regressions on laptops | Until hardware profiling exists |

## Integration Gotchas

Common mistakes when connecting external components/libraries.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Electron preload + IPC | Exposing raw `ipcRenderer`/broad bridges | Expose narrow task-specific methods, validate sender and payloads |
| Node child process tools | Using `exec` with user-influenced strings | Prefer `spawn/execFile` with fixed executable + arg array allowlist |
| SQLite WAL | Assuming WAL needs no operational policy | Add busy timeout, checkpoint strategy, WAL growth monitoring |
| ONNX/ggml runtime | Same thread config across all machines | Device-class profiles for threads, spinning, model size |
| Whisper/VAD pipeline | Running whole audio through ASR always | Gate with VAD and bounded chunk windows |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No warmup path for model/provider | First interaction is very slow | Background warmup + explicit ready state | First user command each launch |
| Monolithic queue between stages | Rising end-to-end lag | Per-stage bounded queues + drop/coalesce policy | Continuous dictation sessions |
| Frequent IPC chatter with large payloads | CPU overhead, GC churn | Coarser event batches + binary/shared buffers | High token/audio throughput |
| Auto-checkpoint on hot path | Random long commits | Move checkpointing off critical path with guardrails | Busy write periods |
| Aggressive thread spinning | High idle CPU/power | Tune spinning + affinity per device class | Laptop thermal envelopes |

## Security Mistakes

Domain-specific security issues beyond generic app security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting model files from arbitrary sources | RCE/supply-chain compromise (esp. pickle-like formats) | Trust policy, signed sources, checksum verification, prefer safer formats |
| Allowing arbitrary command/URL tools | Local privilege abuse and data exfiltration | Explicit tool allowlist, argument schema validation, deny-by-default |
| Opening localhost server for convenience APIs | Violates no-open-ports constraint; local attack surface | In-process/IPC interfaces only, no bind/listen in production |
| Missing tool invocation audit logs | No forensic trail for risky actions | Append-only structured logs with redaction policy |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No confidence/partial transcript display | Users think app is stalled | Stream partials + confidence hints + finalization state |
| Hidden offline failures | "Assistant is flaky" perception | Explicit offline readiness and missing-model diagnostics |
| Silent fallback to weaker model | Unpredictable quality | Surface active model/profile and why fallback occurred |
| No deterministic tool replay | Hard to trust automation | Show exact tool call arguments and reproducible outcome IDs |

## "Looks Done But Isn't" Checklist

- [ ] **Offline mode:** App works with network disabled from boot to task completion
- [ ] **Latency SLO:** p95 end-to-end dictation latency measured and enforced in CI/soak tests
- [ ] **IPC boundary:** All privileged channels have sender + schema validation and contract tests
- [ ] **Tool safety:** Only allowlisted executables/actions are reachable; no raw shell interpolation
- [ ] **Model governance:** Active model manifest, checksum verification, rollback path validated
- [ ] **Reliability:** Crash of ASR/tool worker does not kill UI; recovery path user-visible

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Callback/latency regressions | MEDIUM | Capture traces, isolate blocking ops, deploy hotfix that strips callback to ring-buffer-only path |
| IPC overexposure bug | HIGH | Disable risky channels via kill-switch, rotate affected secrets, ship patched preload and contract tests |
| Model incompatibility rollout | MEDIUM | Revert to last-known-good manifest, invalidate bad artifact, rehydrate model cache from verified source |
| WAL growth / SQLITE_BUSY storm | MEDIUM | Force controlled checkpoint window, terminate long readers, apply busy timeout and retry policy |
| Tool injection vulnerability | HIGH | Disable tool class, patch parser/allowlist, audit logs for abuse, add regression fuzz tests |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Real-time callback blockage | Phase 1 | Stress test with CPU load, zero callback overruns/dropouts |
| Missing latency/backpressure policy | Phase 1 | Queue-depth telemetry + p95 budget alerts |
| Main/UI blocking | Phase 2 | No long tasks above threshold on interactive paths |
| IPC overexposure | Phase 2 | Contract tests for sender/schema checks on every privileged channel |
| Non-deterministic tools/injection | Phase 3 | Replay test: same input => same normalized tool call/result |
| Offline/no-open-ports violations | Phase 0/1 | Network-deny + port-scan integration test passes |
| Model lifecycle chaos | Phase 4 | Manifest checksum and rollback integration test passes |
| WAL/busy reliability issues | Phase 2/5 | Soak test keeps WAL bounded and busy errors below threshold |
| Thread oversubscription thermal drift | Phase 5 | 30-min performance run keeps latency within SLO |
| Missing failure isolation | Phase 2/5 | Kill worker process during task; UI continues and recovers |

## Sources

- Electron Security Checklist (IPC sender validation, context isolation, sandbox, API exposure): https://www.electronjs.org/docs/latest/tutorial/security (HIGH)
- Electron IPC patterns and `sendSync` performance caveat: https://www.electronjs.org/docs/latest/tutorial/ipc (HIGH)
- Electron performance guidance (avoid blocking main/renderer, avoid sync APIs): https://www.electronjs.org/docs/latest/tutorial/performance (HIGH)
- Electron process model and utility process isolation: https://www.electronjs.org/docs/latest/tutorial/process-model (HIGH)
- Node child process security warning (unsanitized input + shell metacharacters): https://nodejs.org/api/child_process.html (HIGH)
- PortAudio callback constraints (no allocation/I/O/locking in callback): https://www.portaudio.com/docs/v19-doxydocs/writing_a_callback.html (HIGH)
- SQLite WAL behavior, checkpoint starvation, busy cases: https://sqlite.org/wal.html (HIGH)
- SQLite busy timeout semantics: https://www.sqlite.org/c3ref/busy_timeout.html (HIGH)
- SQLite journal mode durability tradeoffs: https://sqlite.org/pragma.html#pragma_journal_mode (HIGH)
- ONNX Runtime quantization tradeoffs and hardware caveats: https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html (HIGH)
- ONNX Runtime thread management and spinning controls: https://onnxruntime.ai/docs/performance/tune-performance/threading.html (HIGH)
- whisper.cpp model memory usage, VAD support, and server/open-port examples: https://github.com/ggml-org/whisper.cpp (MEDIUM)
- MCP tools security guidance (human-in-loop, validation, rate limiting, audit logging): https://modelcontextprotocol.io/specification/2025-06-18/server/tools (MEDIUM)
- Hugging Face pickle security risks and safer-format motivation: https://huggingface.co/docs/hub/security-pickle (MEDIUM)
- Safetensors overview: https://huggingface.co/docs/safetensors/index (MEDIUM)

---
*Pitfalls research for: local-first desktop dictation + assistant*
*Researched: 2026-02-15*
