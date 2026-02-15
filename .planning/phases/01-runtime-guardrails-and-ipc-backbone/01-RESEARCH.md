# Phase 1: Runtime Guardrails and IPC Backbone - Research

**Researched:** 2026-02-15
**Domain:** Electron runtime IPC architecture, worker lifecycle recovery, and compatibility guardrails
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Recovery experience
- Default to quiet automatic restart/reconnect.
- If the user is actively using voice when disruption happens, show a non-blocking banner like "Reconnecting...".
- On successful quick recovery, remove banner with no success message (optional tiny toast such as "Back on.").
- Retry automatically 3 times with short backoff (about 0.2s -> 0.8s -> 2s), then present next-step guidance.
- If recovery cannot restore service, emphasize `Restart app` and provide `Show details`.

### Mismatch guidance
- Keep default copy human and non-technical (example: "Finishing an update..." / "Fixing a small setup mismatch...").
- Primary path is automatic in-place refresh/update of background component, then automatic reconnect.
- If primary path fails, show `Restart app` fallback.
- Show one-sentence summary by default, with `Details` expander for expected vs installed versions.
- Include `Copy report` in details.
- Use one recommended path first; reveal fallback only when relevant.

### Runtime trust signals
- Show a small `Local-only mode` badge with tooltip: "Internal connections stay on this device".
- In `Settings > Privacy`, include `Runtime checks` row: "No local ports detected" with `Details` and `Copy report`.
- Keep trust messaging out of main flow by default; surface at startup/runtime only if relevant.
- If trust status cannot be confirmed, warn but continue core local use with `Retry` + `Details`.
- Disable only sensitive extras (future network-linked features) when trust check is unconfirmed; keep local dictation/assistant available.
- Use human-first headline ("Runs locally on your device") with technical detail behind expander.

### Status messaging tone
- Avoid internal/system terms in primary copy (`recovering`, `engine`, `daemon`, `service`, `worker`).
- Default transient messages to short human phrasing (2-5 words): "Getting voice ready...", "Starting voice...", "Refreshing in the background...", "Reconnecting...".
- If delayed, use one gentle update around ~3s ("Still starting, almost there..." / "Taking longer than usual...").
- If not recovered by ~8-10s, show first actionable UI with `Try again` + `Restart app`; keep technical details hidden by default.
- Use human verb CTAs as defaults: `Fix now`, `Try again`, `Restart app`, `Copy report`.

### Claude's Discretion
- Exact banner/toast component styling and placement.
- Exact wording variants among approved tone examples.
- Exact thresholds for delayed-state transitions (within discussed intent).

### Deferred Ideas (OUT OF SCOPE)
- Add a `Report issue` action that auto-collects diagnostics and submits to the project's GitHub owner with optional user note.
</user_constraints>

## Summary

Phase 1 should establish a strict process boundary: renderer talks to main through a narrow preload bridge, and main talks to workers through IPC transports that never bind localhost HTTP ports. Electron already provides the right primitives: `ipcMain`/`ipcRenderer` patterns for renderer-main, `utilityProcess.fork()` for isolated worker processes, `MessagePortMain`/`process.parentPort` for high-throughput worker messaging, and lifecycle signals like `child-process-gone`.

For ARCH-02, treat worker startup as a contract handshake, not best effort. Require protocol version, worker version, capability list, and health state before accepting work. Compare versions with a semver parser (not string comparison), reject mismatches deterministically, then follow the locked UX: quiet auto-retry (3 attempts with short backoff), non-blocking reconnect banner only when user is active, and actionable recovery at ~8-10s.

For trust signaling, publish a runtime guardrail report from main process: active process list (`app.getAppMetrics()`), transport mode (named pipes/MessagePorts), and last trust-check result. Keep technical detail behind `Details`, with a one-line human message by default. If trust verification is inconclusive, warn and continue core local functionality as explicitly required.

**Primary recommendation:** Implement a versioned IPC envelope + mandatory handshake in main/supervisor first, then layer auto-recovery and user-facing status states on top of that deterministic lifecycle.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `electron` | 40.x stable | Desktop runtime, process model, IPC, worker lifecycle events | Official Electron APIs directly cover main-renderer IPC, utility workers, and process crash detection. |
| Node.js runtime in Electron | Bundled with Electron (currently Node 24.x in Electron 40) | `node:net` IPC endpoints, process orchestration | Node `net` officially supports named pipes on Windows and Unix sockets elsewhere for local IPC. |
| `semver` | 7.x | Handshake/version compatibility checks | Avoids unsafe string/version comparison and supports robust range checks. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Electron `utilityProcess` API | Electron built-in | Isolated worker spawning with message channels | Use for crash-prone/CPU-heavy components requiring restart supervision. |
| Electron `MessageChannelMain` / `MessagePortMain` | Electron built-in | Structured message channels beyond basic IPC | Use for streaming events or high-frequency worker responses. |
| Electron `app.getAppMetrics()` | Electron built-in | Enumerate app-associated process metrics for trust report context | Use for diagnostics UI and `Copy report` details. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `utilityProcess.fork()` | `child_process.spawn()` | `spawn()` is flexible, but Electron recommends utility process for Electron-main spawned workers with MessagePort integration. |
| MessagePort worker channel | `node:net` named pipes directly | Named pipes are explicit and portable, but MessagePort reduces framing boilerplate inside Electron worker architecture. |

**Installation:**
```bash
npm install semver
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── ipc/               # renderer-main channel handlers and sender validation
│   ├── supervisor/        # worker FSM, handshake gate, retry budget, backoff
│   ├── runtime-trust/     # no-ports checks, diagnostics report builder
│   └── status/            # human-facing state mapping for banner/toast/settings
├── preload/               # narrow bridge only
├── renderer/
│   ├── runtime-status/    # reconnect banner, delayed states, actionable fallbacks
│   └── settings/privacy/  # Runtime checks row + details + copy report
└── shared/
    ├── protocol/          # versioned envelopes and handshake schema
    └── types/             # status enums and diagnostics payloads
```

### Pattern 1: Versioned Handshake Gate Before Work
**What:** Worker must pass a handshake envelope with protocol + version before receiving any jobs.
**When to use:** Always, for every worker start/restart.
**Example:**
```typescript
// Source: https://raw.githubusercontent.com/npm/node-semver/main/README.md
import semverSatisfies from 'semver/functions/satisfies'

export function acceptHandshake(input: {
  protocol: string
  workerVersion: string
  capabilities: string[]
}) {
  if (input.protocol !== 'sv-ipc/1') return { ok: false, reason: 'protocol-mismatch' }
  if (!semverSatisfies(input.workerVersion, '^1.0.0')) {
    return { ok: false, reason: 'version-mismatch' }
  }
  return { ok: true }
}
```

### Pattern 2: Main-Owned Worker Supervision
**What:** Main process owns spawn/restart lifecycle and crash reason handling.
**When to use:** Always; renderer never manages worker lifecycle.
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/utility-process
// Source: https://www.electronjs.org/docs/latest/api/app#event-child-process-gone
import { app, utilityProcess } from 'electron'

const child = utilityProcess.fork(workerEntrypoint)
child.on('exit', (code) => scheduleReconnect(code))

app.on('child-process-gone', (_event, details) => {
  if (details.type === 'Utility' && details.serviceName === 'scribe-valet-worker') {
    scheduleReconnect(details.exitCode)
  }
})
```

### Pattern 3: Narrow Preload Bridge + Async IPC Only
**What:** Renderer gets task-specific bridge methods, not raw IPC objects; use `invoke/handle` or message ports.
**When to use:** Always for privileged actions and status polling.
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/ipc
import { contextBridge, ipcRenderer } from 'electron/renderer'

contextBridge.exposeInMainWorld('runtime', {
  getStatus: () => ipcRenderer.invoke('runtime:get-status'),
  retryTrustCheck: () => ipcRenderer.invoke('runtime:retry-trust-check')
})
```

### Anti-Patterns to Avoid
- **Loopback HTTP for internal control:** violates ARCH-01 and expands attack surface; use MessagePort/named pipes.
- **`ipcRenderer.sendSync` usage:** blocks renderer and harms responsiveness during recovery.
- **String compare for versions:** creates false compatibility decisions; use semver parsing.
- **Raw IPC exposure in preload:** increases privilege exposure and violates Electron security guidance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Worker process orchestration | Custom process supervisor without Electron lifecycle hooks | `utilityProcess.fork()` + `child-process-gone` + `exit` handling | Electron already provides cross-platform lifecycle signals and process metadata. |
| Version compatibility checks | Manual split/compare logic (`1.10` vs `1.2` bugs) | `semver` `satisfies()/valid()` | Correct SemVer semantics and pre-release behavior are easy to get wrong. |
| Renderer privilege bridge | Generic pass-through IPC bridge | Task-scoped preload methods via `contextBridge` | Prevents accidental privileged capability exposure to renderer. |
| Streaming worker reply protocol | Ad-hoc event string multiplexing | `MessageChannelMain` / `MessagePortMain` | Built-in transfer semantics and queueing reduce protocol fragility. |

**Key insight:** Phase 1 reliability comes from enforcing contracts at boundaries (handshake, channel schema, restart policy), not from adding more fallback code inside business logic.

## Common Pitfalls

### Pitfall 1: Worker accepts jobs before compatibility is proven
**What goes wrong:** Undefined behavior on protocol/version mismatch.
**Why it happens:** Handshake treated as optional metadata.
**How to avoid:** Gate scheduler dispatch on handshake success only.
**Warning signs:** Intermittent decode errors after upgrade/restart.

### Pitfall 2: Recovery loops become user-visible noise
**What goes wrong:** Excessive toasts/modals during transient restarts.
**Why it happens:** UI coupled directly to low-level retry attempts.
**How to avoid:** Map internal retries to locked UX states (quiet first, one delayed update, action UI at ~8-10s).
**Warning signs:** Repeated banners/toasts within first 2-3 seconds.

### Pitfall 3: Using shell-based process calls with unsanitized data
**What goes wrong:** Command injection risk.
**Why it happens:** `exec()` convenience on dynamic input.
**How to avoid:** Prefer `utilityProcess` or `spawn/execFile` without shell interpolation.
**Warning signs:** Any user-influenced string passed to shell command line.

### Pitfall 4: IPC transport drift across main/worker/renderer
**What goes wrong:** Silent contract mismatch after refactors.
**Why it happens:** Channel names and payloads are unversioned strings.
**How to avoid:** Shared envelope types and protocol version checks in all endpoints.
**Warning signs:** One side adds fields and another side ignores/breaks unexpectedly.

### Pitfall 5: Trust-check certainty overstated
**What goes wrong:** UI says "No local ports detected" with weak evidence.
**Why it happens:** No explicit confidence model for runtime checks.
**How to avoid:** Emit trust report with `verified` vs `unconfirmed`, include details and `Retry` path.
**Warning signs:** Cannot explain which process/signal produced trust verdict.

## Code Examples

Verified patterns from official sources:

### Spawn worker and communicate via parent port
```typescript
// Source: https://www.electronjs.org/docs/latest/api/utility-process
// main
const child = utilityProcess.fork(workerPath, [], { serviceName: 'scribe-valet-worker' })
child.postMessage({ kind: 'handshake:init' })

// worker
process.parentPort?.on('message', (event) => {
  if (event.data.kind === 'handshake:init') {
    process.parentPort?.postMessage({ kind: 'handshake:hello', protocol: 'sv-ipc/1' })
  }
})
```

### Transfer MessagePort for streaming status/events
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/message-ports
import { MessageChannelMain } from 'electron'

const { port1, port2 } = new MessageChannelMain()
workerChild.postMessage({ kind: 'bind-status-stream' }, [port1])
port2.on('message', (evt) => onWorkerStatus(evt.data))
port2.start()
```

### Use named pipe / Unix socket path for local IPC endpoint
```typescript
// Source: https://nodejs.org/api/net.html#ipc-support
import net from 'node:net'

const pipePath = process.platform === 'win32'
  ? String.raw`\\?\pipe\scribe-valet-worker`
  : '/tmp/scribe-valet-worker.sock'

net.createServer(onClient).listen(pipePath)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc two-way IPC with event pairs | `ipcRenderer.invoke` + `ipcMain.handle` for request/response | Electron 7+ IPC guidance | Cleaner contract semantics and less reply bookkeeping. |
| Renderer/main monolith for heavy tasks | Utility processes for CPU-heavy/crash-prone work | Modern Electron process model guidance | Better crash isolation and restartability. |
| Loose internal compatibility assumptions | Explicit protocol + semver-gated handshake | Current reliability best practice | Deterministic reject/recover path instead of undefined behavior. |

**Deprecated/outdated:**
- `ipcRenderer.sendSync` on interactive paths: blocks renderer and degrades UX.
- Internal localhost microservice patterns: conflict with ARCH-01 and trust goals.

## Open Questions

1. **What exact evidence qualifies `No local ports detected` as verified?**
   - What we know: Electron exposes app process metrics and process lifecycle events, but not a direct "bound ports for PID" API.
   - What's unclear: Final cross-platform strategy for PID-level socket verification in runtime checks.
   - Recommendation: Ship confidence states (`verified`/`unconfirmed`) now, and add OS-specific socket probes in a follow-up implementation task.

2. **Should worker transport standardize on MessagePort only, or support named pipes as fallback?**
   - What we know: Both are officially supported paths in Electron/Node.
   - What's unclear: Performance and operability tradeoff on target workloads.
   - Recommendation: Plan with transport abstraction and pick one default during implementation benchmarking.

## Sources

### Primary (HIGH confidence)
- https://www.electronjs.org/docs/latest/tutorial/process-model - main/renderer/utility process model and guidance.
- https://www.electronjs.org/docs/latest/api/utility-process - utility process lifecycle and messaging.
- https://www.electronjs.org/docs/latest/tutorial/ipc - IPC patterns and `sendSync` caveat.
- https://www.electronjs.org/docs/latest/tutorial/message-ports - MessagePort transfer patterns in Electron.
- https://www.electronjs.org/docs/latest/tutorial/security - sender validation and preload exposure rules.
- https://www.electronjs.org/docs/latest/api/app#event-child-process-gone - child process crash/exit reasons.
- https://www.electronjs.org/docs/latest/api/structures/process-metric - process metadata structure.
- https://nodejs.org/api/net.html#ipc-support - named pipes/Unix socket IPC rules.
- https://nodejs.org/api/child_process.html - process spawning and shell-safety guidance.
- https://raw.githubusercontent.com/npm/node-semver/main/README.md - semver APIs and range semantics.

### Secondary (MEDIUM confidence)
- https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes - Windows named pipes behavior and security considerations.
- https://www.electronjs.org/blog/electron-40-0 - current stable Electron release context.
- https://www.electronjs.org/blog/ecosystem-node-22 - Node 22 minimum in Electron ecosystem tooling.

### Tertiary (LOW confidence)
- https://man7.org/linux/man-pages/man7/unix.7.html - Unix domain socket specifics for deeper OS-level constraints.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - backed by official Electron/Node docs and project locked decisions.
- Architecture: HIGH - official process/IPC APIs directly support required phase behaviors.
- Pitfalls: HIGH - directly supported by official security, IPC, and child process guidance.

**Research date:** 2026-02-15
**Valid until:** 2026-03-17
