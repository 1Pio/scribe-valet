# Stack Research

**Domain:** Local-first desktop voice dictation + assistant (Windows-first, portable to macOS/Linux)
**Researched:** 2026-02-15 (revised)
**Confidence:** HIGH (for architecture and product-fit), MEDIUM (for exact package/version pins to finalize during implementation)

## Locked Product Decisions Reflected Here

1. Use **Electron** for desktop shell (not Tauri).
2. Use **Convex + WorkOS AuthKit** for optional cloud history (not Supabase).
3. Keep **IPC-only internal architecture** (named pipes/stdin-stdout), no localhost HTTP services.
4. Keep **offline-first default** and **no cloud history unless logged in**.
5. Keep **plug-and-play** install experience: users should not run pip/npm manually for runtime.

## Recommended Stack (Primary)

### Core Technologies

| Technology | Version Policy | Purpose | Why Recommended | Confidence |
|------------|----------------|---------|-----------------|------------|
| Electron | Current stable major, pinned in repo lockfile | Desktop shell (window/tray/global shortcuts/UI bridge) | Best fit for your stated preference and distribution predictability across Windows/macOS/Linux. Chromium bundled means fewer runtime surprises across machines. | HIGH |
| Node.js (LTS) | Active LTS only | Main/preload process runtime for Electron shell | Stable ecosystem and mature native-process management for orchestrating sidecars through IPC. | HIGH |
| React + TypeScript + Vite | Pin current stable in lockfile | UI for tray, settings, onboarding, history viewer, diagnostics | Fast UI iteration and straightforward Electron integration via preload bridge APIs. | HIGH |
| Core runtime sidecar (Rust or C++) | Pin toolchains per CI | Owns audio pipeline, STT/LLM/TTS orchestration, tool invocation policy, reliability loops | Keeps heavy/unsafe work out of renderer and main process; enforces strict process boundaries and deterministic behavior. | HIGH |
| `whisper.cpp` | Pin tested release per platform | Local STT for Dictation + Assistant | Strong CPU baseline with optional acceleration backends; proven local-first fit. | HIGH |
| `llama.cpp` | Pin tested build per model set | Local LLM for dictation cleanup + assistant reasoning + tool planning | Mature local inference runtime with good quantization/control for latency and memory budgets. | HIGH |
| Local TTS engine (Kokoro ONNX or equivalent) | Pin tested runtime/model bundle | Local speech output for Assistant mode | CPU-first path is adequate for MVP and most hardware; can add acceleration later without changing architecture. | MEDIUM |
| SQLite | Current stable, pinned by package manager | Local settings/model registry/state metadata only | Reliable embedded store for config, model integrity records, and optional crash-safe queue metadata. Not used as default user history store. | HIGH |
| Convex | Current stable, pinned in lockfile | Optional cloud history backend (text artifacts only) | Matches project requirement for opt-in cloud sync and clean app-level data model. | HIGH |
| WorkOS AuthKit | Current stable, pinned in lockfile | Optional login identity flow | Officially supported integration path with Convex for auth. | HIGH |

### Cloud Rule (Non-Negotiable)

- If user is **not logged in**: no remote history is written.
- If user **is logged in**: sync only text artifacts defined in requirements.
- Audio is never uploaded.

## Architecture Pattern (Shell vs Core)

### Shell (Electron)

- UI rendering, tray menu, onboarding/settings, global hotkeys, clipboard/paste integration.
- No model inference in renderer.
- Security defaults: `contextIsolation: true`, `nodeIntegration: false`, narrow preload bridge.

### Core Runtime (sidecar)

- Owns capture/transcribe/cleanup/respond pipeline.
- Owns worker supervision, timeout/retry policy, and health checks.
- Owns tool execution governance (allowlists, deterministic schema, audit events).
- Communicates only via IPC (named pipes/stdin-stdout), never localhost services.

## Local Storage Policy (Clarified)

SQLite is for:

- settings/preferences
- model index/checksums/download/install state
- optional bounded operational metadata (job ids, retries, failure markers)

SQLite is **not** default dictation/assistant history storage in logged-out mode.

## Python Tools Runtime (Plug-and-Play Safe)

### Recommended Runtime Model

- Bundle an app-managed Python runtime for tool execution.
- User edits a local `tools.py` file; app executes tools through deterministic schemas.
- No required user pip setup for baseline usage.

### Advanced Mode (Optional)

- Allow system Python path override in advanced settings.
- Mark as unsupported-by-default path for reliability parity.

### Dev Tools vs Runtime

- `uv`, `ruff`, and similar tooling are development-only.
- Do not appear in end-user setup instructions.

## Hardware Strategy (Realistic)

### Baseline Guarantee

- CPU-only execution always works.

### Acceleration Policy

- GPU acceleration is best-effort and optional.
- If unavailable/misconfigured, app falls back to CPU with clear user messaging.

### Packaging Guidance

- Ship CPU baseline artifacts in core installer.
- Add optional accelerator packs later (or selective backend bundles), not mandatory driver/runtime setup for first run.

## TTS Guidance

- Treat TTS as CPU-first for MVP.
- Avoid locking MVP to CUDA-only runtime assumptions.
- On Windows GPU acceleration, evaluate DirectML-compatible path when/if latency demands it.

## Supporting Libraries (Electron-Oriented)

| Library | Purpose | When to Use | Confidence |
|---------|---------|-------------|------------|
| `electron` | Desktop shell runtime | Always | HIGH |
| `electron-builder` or `electron-forge` | Packaging/installers/updates | Always | HIGH |
| `better-sqlite3` or equivalent | Local metadata store | Always for settings/model metadata | HIGH |
| `zod` | Strict runtime schema validation (IPC/tool contracts) | Always | HIGH |
| `@convex-dev/*` packages | Convex client/server integration | Only when cloud sync feature is enabled | HIGH |
| WorkOS AuthKit packages | Login flows for optional sync | Only when user opts into login | HIGH |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Supabase for this project | Conflicts with explicit product decision to use Convex + AuthKit. | Convex + WorkOS AuthKit integration. |
| Tauri as shell for this project | Conflicts with explicit project direction and distribution preference. | Electron shell + isolated core sidecar runtime. |
| `llama-server` / `whisper-server` internal HTTP patterns | Violates no-ports IPC-only rule. | Sidecar binaries over stdio/named pipes. |
| User-facing `pip install ...` setup for runtime | Breaks plug-and-play requirement. | Bundle runtime dependencies with app installer. |
| Treating SQLite as default conversation history in logged-out mode | Conflicts with no-history-unless-logged-in rule. | Keep SQLite limited to settings/model/runtime metadata. |

## Two Valid Stack Variants (Same Core Architecture)

### Variant A (Recommended for this project)

- Shell: Electron
- Core: sidecar runtime (Rust or C++)
- AI engines: `whisper.cpp` + `llama.cpp` + local TTS
- Optional cloud: Convex + WorkOS AuthKit
- Local DB: SQLite for settings/model metadata only

### Variant B (Not selected for this project)

- Shell: Tauri
- Core/cloud/local rules unchanged
- Kept only as future migration possibility, not current recommendation

## Source Notes Used in This Revision

- Convex AuthKit integration docs: https://docs.convex.dev/auth/authkit/
- SQLite official docs: https://sqlite.org/
- ONNX Runtime DirectML docs: https://onnxruntime.ai/docs/execution-providers/DirectML-ExecutionProvider.html
- Microsoft DirectML notes: https://learn.microsoft.com/en-us/windows/ai/directml/dml-version-history
- Electron security baseline: https://electronjs.org/docs/latest/tutorial/security
- React versions: https://www.npmjs.com/package/react

---
*Stack research for: local-first desktop voice dictation + assistant (Scribe-Valet)*
*Researched: 2026-02-15 (revised after pre-execution alignment)*
