# Project Research Summary

**Project:** Scribe-Valet
**Domain:** Local-first desktop voice dictation + assistant (IPC-only, no localhost ports)
**Researched:** 2026-02-15
**Confidence:** MEDIUM-HIGH

## Executive Summary

Scribe-Valet is a two-mode desktop utility: fast dictation for paste-anywhere text entry, and short-turn voice assistant interactions with optional tool use. Across all research, the strongest expert pattern is a local-first runtime with strict control-plane boundaries, isolated inference workers, and explicit offline guarantees. The product should optimize for deterministic behavior, low latency, and transparent execution rather than broad autonomous capability in v1.

The recommended implementation is Tauri 2 + Rust control plane, with `whisper.cpp` (STT), `llama.cpp` (LLM), and local ONNX TTS, all supervised as sidecar processes over IPC (stdio/named pipes/message channels). Persist transcripts/settings/job state in SQLite (WAL), gate privileged operations behind versioned IPC contracts, and ship hardware-aware presets (Light/Balanced/Power) so CPU fallback is always viable.

The key delivery risk is reliability under sustained real-time load (audio callback discipline, queue backpressure, process isolation, and thermal/thread tuning). The key security risk is over-broad IPC and unsafe tool execution. Mitigation is straightforward but must be front-loaded: narrow allowlisted IPC, authenticated worker handshakes, deterministic tool schemas/logs, offline/port-scan acceptance tests, and explicit model artifact governance.

## Key Findings

### Recommended Stack

STACK research strongly supports a Tauri-first desktop architecture with Rust orchestration and local model runtimes. The stack is modern, practical for offline UX, and aligned with the no-ports requirement.

**Core technologies:**
- Tauri `2.10.2`: desktop shell + capability-based security boundary; best fit for IPC-only local utility apps.
- Rust `1.93.1` (stable): deterministic orchestration, process supervision, and low-overhead realtime pipeline management.
- React `19.2.4` + Vite `7.3.1` + TypeScript `5.9.3`: fast tray/settings UI development with strong ecosystem support.
- `whisper.cpp` `v1.8.3`: local STT with CPU/GPU backend flexibility for wide hardware coverage.
- `llama.cpp` `b8061`: local assistant inference with quantization and predictable latency/memory tradeoffs.
- Kokoro ONNX + ONNX Runtime `1.24.1`: local TTS path with GPU acceleration and clean CPU fallback.
- SQLite `3.51.2`: durable local-first storage for transcripts, settings, and job/event ledgers.

Critical compatibility constraints: keep Tauri core/plugins on 2.x, and keep sidecars as IPC-managed processes (not localhost REST servers).

### Expected Features

FEATURES research converges on reliability-first MVP scope: users expect shortcut capture, strong STT quality, direct insertion into focused apps, and clear privacy controls.

**Must have (table stakes):**
- Push-to-talk capture with local STT and robust punctuation/cleanup.
- Focused-field insertion with clipboard backup + restore (never lose dictation).
- Basic editing voice commands, mic selection, and hardware-aware Auto/CPU/GPU fallback.
- Assistant basics: short history, model selection, and local STT -> LLM -> TTS turns.

**Should have (competitive):**
- Explicit Dictation vs Assistant mode boundary.
- Deterministic cleanup pipeline with raw transcript fallback.
- Per-mode Python tool allowlists and transparent execution logs.
- Preset-driven onboarding (Light/Balanced/Power) and explicit provider routing visibility.

**Defer (v2+):**
- Always-on wake word.
- Full desktop voice macro/control platform.
- Plugin marketplace and autonomous multi-agent workflows.

### Architecture Approach

ARCHITECTURE research recommends a brokered control plane, isolated workers, and a durable job ledger. One inconsistency must be resolved during planning: the document describes Electron-specific mechanics, while STACK recommends Tauri. The architectural principles still transfer directly and should be implemented with Tauri IPC/events + Rust-side process supervision.

**Major components:**
1. Control plane (main/Rust): policy checks, routing, lifecycle, scheduling, and event normalization.
2. Isolated workers/sidecars: STT, LLM cleanup, TTS, tools, model manager, optional cloud sync.
3. Persistence layer: SQLite WAL + job/event ledger for replay, crash recovery, and deterministic state.
4. Shared protocol contracts: versioned envelopes, sender validation, cancellation/timeouts, and handshake/auth.

### Critical Pitfalls

Top pitfalls from PITFALLS research and required controls:

1. **Realtime callback does non-realtime work** - keep audio callback ring-buffer-only; no locks/I/O/allocation on capture path.
2. **No latency/backpressure policy** - enforce per-stage budgets, bounded queues, and explicit drop/coalesce/degrade rules.
3. **Main/UI blocking by inference or sync calls** - isolate heavy work in sidecars; ban synchronous APIs on interactive paths.
4. **Over-broad IPC + weak sender validation** - narrow typed contracts, strict schema/sender checks, least-privilege bridge.
5. **Non-deterministic/injectable tool execution** - JSON-schema tool contracts, allowlists, argument canonicalization, append-only audit logs.

## Implications for Roadmap

Based on dependencies across features, architecture, and pitfalls, use this phase structure:

### Phase 0: Constraint Harness and Baseline Guardrails
**Rationale:** Offline/no-ports constraints are non-negotiable and must be testable before feature work.
**Delivers:** Network-deny acceptance suite, port-listener detection, capability baseline, minimum telemetry/tracing scaffolding.
**Addresses:** Privacy/local-first table stakes and anti-feature prevention.
**Avoids:** Hidden network paths, accidental localhost server introduction.

### Phase 1: Dictation Core (Hotkey -> STT -> Insert)
**Rationale:** Fast reliable dictation is the primary product promise and a prerequisite for trust.
**Delivers:** Global hotkey capture, audio pipeline, local STT partial/final output, cleanup + raw fallback, focused-field insertion, clipboard recovery.
**Addresses:** P1 features (dictation, insertion, cleanup, recovery).
**Avoids:** Callback blocking, missing backpressure policy, data loss on insertion failures.

### Phase 2: Control Plane Hardening + Persistence
**Rationale:** Security and reliability boundaries must be in place before assistant/tool expansion.
**Delivers:** Versioned IPC contracts, sender/schema validation, authenticated worker handshake, supervisor restart policy, SQLite WAL job ledger.
**Implements:** Brokered command/event bus and crash-recovery architecture patterns.
**Avoids:** UI/main freezes, IPC overexposure, WAL contention chaos, single-process fragility.

### Phase 3: Assistant Core + Safe Tool Runtime
**Rationale:** Assistant value depends on deterministic orchestration and explainable tool execution.
**Delivers:** STT -> LLM -> TTS short turns, per-mode allowlists, deterministic tool planner, execution logs/replay IDs.
**Addresses:** Assistant P1 scope and key differentiators.
**Avoids:** Tool nondeterminism, command injection, opaque automation failures.

### Phase 4: Model Manager + Hardware-Aware Onboarding
**Rationale:** Sustainable cross-device performance requires governed model lifecycle and guided defaults.
**Delivers:** Model manifest/checksum verification, install/rollback flow, runtime compatibility matrix, Light/Balanced/Power presets.
**Uses:** `whisper.cpp`, `llama.cpp`, ONNX runtime with Auto/CPU/GPU policy.
**Avoids:** Model incompatibility, disk bloat, silent fallback confusion.

### Phase 5: Reliability, Performance, and Optional Cloud Sync
**Rationale:** Soak-proven stability should precede optional connected features.
**Delivers:** 30+ minute thermal/latency tuning, queue/throughput optimization, bounded WAL growth policy, optional encrypted text-only sync.
**Addresses:** P2 items (VAD, multi-language tuning, optional sync) in controlled rollout.
**Avoids:** Thread oversubscription regressions, long-session latency drift, local-first trust erosion.

### Phase Ordering Rationale

- Core trust loop first: users must experience reliable local dictation before assistant breadth.
- Security/reliability boundaries precede tooling: do not ship flexible tools before IPC and policy hardening.
- Model governance before scaling variants: presets and lifecycle control prevent support debt.
- Optional cloud last: local-first behavior must remain complete and proven without internet.

### Research Flags

Phases likely needing deeper `/gsd-research-phase` during planning:
- **Phase 3:** Deterministic Python tool sandbox design on Windows (process isolation, argument canonicalization, audit model).
- **Phase 4:** Model artifact trust policy (signing/checksum distribution, rollback semantics, safe format constraints).
- **Phase 5:** Optional cloud sync crypto/key lifecycle details (Stronghold integration + conflict model).

Phases with standard patterns (can likely skip extra research):
- **Phase 0:** Offline/port guardrail testing patterns are well established.
- **Phase 1:** Hotkey + STT + insertion flow is common in dictation products.
- **Phase 2:** Versioned IPC, worker supervision, and SQLite WAL operations are well documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Strong official documentation and clear fit with product constraints. |
| Features | MEDIUM | Good market triangulation, but differentiator impact still needs user validation. |
| Architecture | MEDIUM | Principles are solid, but source doc is Electron-flavored and must be translated to Tauri implementation details. |
| Pitfalls | HIGH | Risks are concrete, recurring in production systems, and backed by strong primary sources. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- Architecture framework mismatch (Electron examples vs Tauri target): translate each boundary/pattern to concrete Tauri/Rust implementation contracts in planning.
- Hardware matrix uncertainty: define minimum supported CPU/RAM/GPU tiers and benchmark model/profile defaults on representative Windows laptops.
- Tool trust boundary specifics: finalize Python tool packaging, sandbox permissions, and audit-retention/redaction policy before broad tool exposure.
- TTS stack maturity variance: validate Kokoro ONNX quality/latency against fallback options for low-end and non-NVIDIA environments.

## Sources

### Primary (HIGH confidence)
- Tauri docs (`v2` IPC, sidecars, plugins) - stack fit, IPC constraints, permissions model.
- `whisper.cpp` and `llama.cpp` official repositories/releases - local inference capabilities and backend support.
- SQLite official docs (`wal`, busy timeout, journaling) - persistence reliability constraints.
- Electron official security/performance/process/IPC docs - transferable process isolation and IPC hardening patterns.
- Node.js child process/docs + Win32 named pipes docs - process/IPC safety and platform mechanics.
- PortAudio callback guidance - realtime audio callback constraints.

### Secondary (MEDIUM confidence)
- Product docs/sites (Superwhisper, Epicenter Whispering, GPT4All, LM Studio) - table-stakes UX and differentiator baselines.
- Kokoro ONNX + ONNX Runtime package/docs - practical local TTS options and runtime behavior.
- MCP tool security guidance and safetensors/HF security notes - tool/model trust policy direction.

### Tertiary (LOW confidence)
- Marketing-level product positioning sources (e.g., Jan site) - directional only, requires validation in product testing.

---
*Research completed: 2026-02-15*
*Ready for roadmap: yes*
