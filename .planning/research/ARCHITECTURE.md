# Architecture Research

**Domain:** Local-first desktop voice dictation + assistant
**Researched:** 2026-02-15
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                UI Layer                                    │
├────────────────────────────────────────────────────────────────────────────┤
│  Renderer UI    Preload API Bridge    Local UX State (hotkeys, session)   │
│      │                 │                           │                        │
├──────┴─────────────────┴───────────────────────────┴────────────────────────┤
│                        Control Plane (Main Process)                         │
├────────────────────────────────────────────────────────────────────────────┤
│  IPC Router   Worker Supervisor   Policy/Auth   Job Scheduler   Event Bus   │
│      │               │                 │              │             │        │
├──────┴───────────────┴─────────────────┴──────────────┴─────────────┴────────┤
│                     Data Plane (Isolated Workers)                            │
├────────────────────────────────────────────────────────────────────────────┤
│  Audio I/O  STT  LLM Cleanup  TTS  Tool Runner  Model Manager  Cloud Sync*  │
│                     (*optional, only when logged in)                         │
├────────────────────────────────────────────────────────────────────────────┤
│                               Local Storage                                  │
├────────────────────────────────────────────────────────────────────────────┤
│  SQLite (WAL)   File Blob Cache   Model Files   Encrypted Secrets Store      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Renderer + Preload | UX, capture intents, present partial/final results, never touches raw privileged APIs | Electron renderer with `contextBridge` exposing narrow methods |
| Main Process Control Plane | Single trusted broker for all commands/events, policy checks, lifecycle orchestration | Electron main process + typed IPC router |
| Worker Supervisor | Spawn, monitor, restart, health-check workers; enforce restart budgets and backoff | `utilityProcess.fork` (preferred) or `child_process.spawn/fork` |
| STT Worker | Streaming transcription and partial hypotheses | Isolated process, model runtime bindings |
| LLM Cleanup Worker | Punctuation/casing/rewrites; structured assistant output | Isolated process, prompt + policy layer |
| TTS Worker | Synthesis and playback streaming hooks | Isolated process with audio output adapter |
| Tool Runner Worker | Deterministic tool execution with strict allowlist and timeouts | Isolated process with command sandbox and audit logs |
| Model Manager Worker | Download/verify/activate local models, VRAM/CPU routing | Isolated process + artifact manifest verifier |
| Settings/Profile Service | Reads/writes app settings, feature flags, model prefs | Main-side service + SQLite tables |
| Cloud Sync Worker (optional) | Push/pull cloud history and account-scoped metadata | Isolated process using HTTPS client |
| Persistence Layer | Durable settings/model metadata, bounded runtime job metadata, and crash recovery markers | SQLite in WAL mode + file cache |

## Recommended Project Structure

```
src/
├── main/                     # Trusted control plane and app lifecycle
│   ├── bootstrap/            # startup, single-instance, app wiring
│   ├── ipc/                  # renderer↔main channel definitions/handlers
│   ├── supervisor/           # worker FSM, restart policy, health checks
│   ├── scheduler/            # job queue, priority, cancellation
│   ├── policy/               # authz, capability checks, feature gates
│   └── persistence/          # db repositories and migrations
├── preload/                  # minimal renderer API surface
├── renderer/                 # UI (dictation, assistant, settings, models)
├── workers/                  # isolated worker entrypoints
│   ├── stt/
│   ├── llm/
│   ├── tts/
│   ├── tools/
│   ├── model-manager/
│   └── cloud-sync/
├── shared/
│   ├── protocol/             # versioned IPC envelopes, schemas, codecs
│   ├── contracts/            # command/result/event type contracts
│   └── observability/        # tracing ids, metrics/event names
└── native/                   # optional native addons/runtime bindings
```

### Structure Rationale

- **main/** keeps all privileged orchestration centralized; this is the only place that decides who can call what.
- **workers/** enforces blast-radius isolation; STT or model crashes do not take down the UI.
- **shared/protocol/** prevents IPC drift and supports explicit protocol versioning.
- **persistence/** decouples storage from worker logic so crash recovery can be deterministic.

## Architectural Patterns

### Pattern 1: Brokered Command/Event Bus (No Direct Renderer-to-Worker)

**What:** Renderer talks only to main; main routes commands to workers and emits normalized events back.
**When to use:** Always, especially with strict no-ports and untrusted UI input.
**Trade-offs:** Slight latency overhead; much better security, observability, and policy control.

**Example:**
```typescript
type Envelope<T> = {
  protocol: "sv-ipc/1";
  requestId: string;
  sender: "renderer" | "main" | "worker";
  target: "main" | "stt" | "llm" | "tts" | "tools" | "model-manager" | "cloud-sync";
  kind: "command" | "event" | "result";
  ts: number;
  payload: T;
};
```

### Pattern 2: Versioned + Authenticated Worker Handshake

**What:** Every worker must complete a startup handshake before accepting work.
**When to use:** Always; mandatory for robust lifecycle + security boundary.
**Trade-offs:** More boot code, but prevents protocol mismatch and rogue-client attachment.

**Example:**
```typescript
type HandshakeHello = {
  protocol: "sv-ipc/1";
  service: "stt" | "llm" | "tts" | "tools" | "model-manager" | "cloud-sync";
  workerVersion: string;
  capabilities: string[];
  nonce: string;
  authTag: string; // HMAC(nonce + service + version, sessionSecret)
};
```

### Pattern 3: Durable Job Ledger for Crash Recovery

**What:** Persist job state transitions (`queued` -> `running` -> `done`/`failed`) in SQLite.
**When to use:** Any user-visible task (dictation chunks, cleanup, TTS render, tool calls, sync operations).
**Trade-offs:** Extra write volume; enables replay, dedupe, and deterministic restart behavior.

## Data Flow

### Request Flow

```
[Mic/HK/User Action]
    ↓
[Renderer]
    ↓ (invoke)
[Main IPC Router]
    ↓ (policy + route)
[Supervisor/Scheduler]
    ↓ (named pipe/message port)
[Worker]
    ↓
[Result Event]
    ↓
[Main Event Bus]
    ↓
[Renderer UI + Persistence]
```

### State Management

```
[SQLite WAL + In-Memory Session Cache]
    ↓ (subscriptions)
[Main Event Bus]
    ↓
[Renderer stores]
    ↔
[User interactions / commands]
```

### Key Data Flows

1. **Realtime dictation:** Audio capture -> STT partials -> renderer live text -> LLM cleanup -> final insert + clipboard backup + bounded local recovery artifact.
2. **Assistant turn:** Prompt -> LLM worker -> optional tool-run requests -> tool results -> final answer -> optional TTS stream.
3. **Model lifecycle:** User selects model -> model manager downloads/verifies/activates -> settings updated -> workers restart with new runtime.
4. **Optional cloud history:** Sync worker writes text history to Convex only when user is authenticated via WorkOS AuthKit; no remote writes while logged out.

### IPC Boundaries (Major)

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| Renderer <-> Main | Electron IPC (`invoke`/events via preload) | Bi-directional | Strict allowlist; validate sender and payload schema |
| Main <-> Worker Supervisor | In-process calls/events | Bi-directional | Supervisor owns process lifecycle state machine |
| Supervisor <-> Workers | Named pipes / MessagePort channels | Bi-directional | No localhost/internal HTTP; framed envelopes only |
| Worker <-> Local DB | Usually mediated by main persistence service | Mostly worker -> main -> DB | Avoid direct DB writes from all workers to reduce lock contention |
| Cloud Sync Worker <-> Remote API | HTTPS | Outbound only | Optional; only enabled after login/token unlock |

## Suggested Build Order (Dependencies)

1. **Control-plane skeleton + protocol contracts**
   - Build main process bootstrap, typed IPC envelopes, preload bridge, sender validation.
   - Dependency: none (foundation).
2. **Worker supervisor + handshake protocol**
   - Add spawn/kill/restart FSM, health checks, authenticated/versioned handshake.
   - Dependency: phase 1 protocol contracts.
3. **Persistence + durable job ledger**
   - Add SQLite schema (jobs/events/settings), migration runner, replay-on-startup.
   - Dependency: phases 1-2 for stable IDs and lifecycle hooks.
4. **Core speech pipeline (STT -> cleanup -> UI)**
   - Add STT worker first, then LLM cleanup worker; wire streaming partial/final events.
   - Dependency: phases 1-3.
5. **TTS + tool runner**
   - Add deterministic tool execution + timeouts, then TTS rendering and playback events.
   - Dependency: phases 1-4.
6. **Model manager + hot-swap lifecycle**
   - Add model install/verify/switch with coordinated worker restarts.
   - Dependency: supervisor + persistence.
7. **Optional cloud sync/history**
   - Add login token storage, sync queue, conflict handling.
   - Dependency: durable local ledger and secrets management.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single-machine architecture is enough; optimize startup and cold model load time first |
| 1k-100k users | Focus on telemetry-driven crash loops, model artifact CDN strategy, and migration robustness |
| 100k+ users | Split model distribution/control metadata services and sync backend concerns; desktop core remains local-first |

### Scaling Priorities

1. **First bottleneck:** Worker cold start + model load latency; fix with prewarm pools and staged initialization.
2. **Second bottleneck:** WAL growth/checkpoint stalls and long readers; fix with short transactions and explicit checkpoint policy.

## Anti-Patterns

### Anti-Pattern 1: "Everything in main process"

**What people do:** Put STT/LLM/TTS/tool execution directly in main.
**Why it's wrong:** UI freezes, large blast radius, hard crash recovery.
**Do this instead:** Keep main as control plane only; run compute in isolated workers.

### Anti-Pattern 2: "Ad-hoc IPC strings without versioning"

**What people do:** Free-form channel names/payloads and implicit contracts.
**Why it's wrong:** Silent breakage during updates, impossible compatibility guarantees.
**Do this instead:** Use versioned envelopes + schema validation + explicit capability negotiation.

### Anti-Pattern 3: "HTTP loopback microservices on localhost"

**What people do:** Internal REST APIs between local components.
**Why it's wrong:** Violates no-ports rule, expands attack surface, complicates auth.
**Do this instead:** Named pipes/MessagePorts with authenticated handshake and scoped capabilities.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Convex cloud history API | Dedicated cloud-sync worker via HTTPS | Enabled only after WorkOS AuthKit login; no audio upload |
| Model artifact hosting | Model manager downloads signed manifests/artifacts | Verify hash/signature before activation |
| OS credential store | Main process via `safeStorage` | Store login/refresh tokens and handshake secrets |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| renderer <-> main | Preload-exposed IPC methods only | Validate sender and payloads on every call |
| main <-> workers | Named pipe/MessagePort framed protocol | Include `requestId`, timeout, cancellation token |
| supervisor <-> scheduler | In-process events | Scheduler is stateless; supervisor owns lifecycle authority |
| persistence <-> all services | Repository interfaces | Enforce idempotency and transaction boundaries |

## Sources

- Electron Process Model and IPC docs (official): https://www.electronjs.org/docs/latest/tutorial/process-model (MEDIUM)
- Electron IPC tutorial (official): https://www.electronjs.org/docs/latest/tutorial/ipc (MEDIUM)
- Electron utility process API (official): https://www.electronjs.org/docs/latest/api/utility-process (MEDIUM)
- Electron MessagePorts tutorial (official): https://www.electronjs.org/docs/latest/tutorial/message-ports (MEDIUM)
- Electron security checklist (official): https://www.electronjs.org/docs/latest/tutorial/security (MEDIUM)
- Node.js `net` IPC support and named-pipe path rules: https://nodejs.org/api/net.html#ipc-support (MEDIUM)
- Node.js child process lifecycle APIs: https://nodejs.org/api/child_process.html (MEDIUM)
- Microsoft Win32 named pipes and security scope: https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes (MEDIUM)
- SQLite WAL behavior and concurrency: https://www.sqlite.org/wal.html (MEDIUM)

---
*Architecture research for: local-first desktop voice dictation + assistant systems*
*Researched: 2026-02-15*
