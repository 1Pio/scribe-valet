# Stack Research

**Domain:** Local-first desktop voice dictation + assistant (Windows-first, portable to macOS/Linux)
**Researched:** 2026-02-15
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Tauri | `2.10.2` | Desktop shell + secure frontend/backend boundary | Best fit for IPC-first desktop apps: native Rust core, web UI, capability-based permissions, sidecar support, and small bundles compared to Chromium-bundled runtimes. | HIGH |
| Rust (stable toolchain) | `1.93.1` | Native orchestration layer (audio pipeline, process supervision, IPC, security policy) | Strong performance and predictable memory usage for realtime STT/TTS orchestration; current stable is well above plugin minimums (`>=1.77.2`). | HIGH |
| React + Vite + TypeScript | `react@19.2.4`, `vite@7.3.1`, `typescript@5.9.3` | Tray-first UI, settings, transcript review, action transparency UI | This is the most standard 2025-2026 frontend stack in Tauri projects: fast HMR/dev loops, good DX, and stable plugin ecosystem integration. | MEDIUM |
| whisper.cpp | `v1.8.3` | Local STT engine for Dictation + Assistant input | C/C++ runtime with CPU-only mode and multiple acceleration backends (CUDA, Vulkan, OpenVINO, CoreML). Excellent fit for offline-first + hardware fallback. | HIGH |
| llama.cpp | `b8061` | Local LLM inference for Assistant mode + tool routing | Mature local inference runtime with broad backend coverage (CPU, CUDA, Vulkan, etc.), quantization support, and high control over latency/memory tradeoffs. | HIGH |
| Kokoro ONNX stack | `kokoro-onnx@0.5.0`, `onnxruntime-gpu@1.24.1` (`onnxruntime@1.24.1` CPU fallback) | Local TTS synthesis | Lightweight local TTS that is practical for desktop assistant UX; ONNX Runtime gives portable CPU/GPU execution paths and clean fallback behavior. | MEDIUM |
| SQLite | `3.51.2` | Local transcript store, settings, and optional action logs/history | De facto local-first embedded DB: zero service, single-file durability, and direct fit for offline desktop applications. | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `@tauri-apps/plugin-global-shortcut` | `2.3.1` | Global hotkeys (push-to-talk, dictate-now, cancel) | Always; this is core to “capture from anywhere” UX. | HIGH |
| `@tauri-apps/plugin-shell` | `2.3.5` | Spawn/monitor sidecars (whisper/llama/tts/python tools) with allowlisted commands | Always if you keep model runtimes in isolated child processes (recommended). | HIGH |
| `interprocess` (Rust crate) | `2.3.1` | Named pipes / local sockets for internal IPC | Use when stdio is not enough and you need persistent duplex channels without localhost HTTP. | HIGH |
| `@tauri-apps/plugin-clipboard-manager` | `2.3.2` | Clipboard fallback for paste-anywhere dictation | Always for robust text insertion fallback when simulated paste fails. | HIGH |
| `@tauri-apps/plugin-sql` | `2.3.2` | Frontend-safe SQL access via sqlx | Use if frontend directly reads history/settings; otherwise keep DB access Rust-only for stricter boundaries. | HIGH |
| `@tauri-apps/plugin-stronghold` | `2.3.1` | Secrets/key material storage (cloud tokens, encryption keys) | Use before enabling any optional cloud history/sync features. | HIGH |
| `cpal` (Rust crate) | `0.17.1` | Cross-platform low-latency audio capture/playback | Use for microphone stream capture and playback without platform-specific code forks. | MEDIUM |
| `@supabase/supabase-js` + `libsodium-wrappers` | `2.95.3` + `0.8.2` | Optional encrypted cloud history sync | Use only in opt-in cloud mode; encrypt client-side before upload so cloud stores ciphertext only. | MEDIUM |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| CMake | Build `whisper.cpp` and `llama.cpp` sidecar binaries | Produce per-target binaries (`windows`, `macos`, `linux`) and bundle with Tauri `externalBin`. |
| `uv` (`0.10.2`) | Isolated Python env for optional tool plugins and Kokoro pipeline scripts | Prefer this over system Python package drift. |
| `ruff` (`0.15.1`) | Fast lint/format for optional Python tool ecosystem | Keeps Python tooling quality without heavyweight config. |

## Installation

```bash
# Core frontend + Tauri
npm install react react-dom @tauri-apps/api @tauri-apps/plugin-global-shortcut @tauri-apps/plugin-shell @tauri-apps/plugin-clipboard-manager @tauri-apps/plugin-sql @tauri-apps/plugin-stronghold

# Optional cloud history
npm install @supabase/supabase-js libsodium-wrappers zod

# Python local TTS/runtime utilities
python -m pip install kokoro-onnx onnxruntime-gpu uv ruff
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Tauri 2 | Electron | Use Electron only if your team is fully JS/TS and cannot support Rust. For this app's offline, low-overhead, IPC/security constraints, Tauri is the better default. |
| Direct `llama.cpp` sidecar | Ollama | Use Ollama only if localhost REST is acceptable and you want out-of-the-box model management over strict internal IPC design. |
| `whisper.cpp` | faster-whisper (`1.2.1`) | Use faster-whisper if Python is already the primary runtime and CUDA-only deployment is acceptable. |
| Kokoro ONNX local TTS | Cloud TTS APIs | Use cloud TTS only for premium voices; keep local TTS as default path to preserve offline usability and privacy. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `llama-server` / `whisper-server` as internal architecture | They are HTTP-server-oriented patterns; your non-negotiable is IPC-only internals with no localhost ports. | Run `llama.cpp` / `whisper.cpp` as sidecar processes via stdio or named pipes. |
| Ollama as core runtime | Official usage is REST over `http://localhost:11434`; violates strict no-localhost-internals requirement. | Native `llama.cpp` integration/sidecar under Tauri permissions. |
| Docker-based local runtime assumptions | Project explicitly disallows Docker and it adds avoidable packaging complexity for desktop users. | Bundle native binaries per target with Tauri `externalBin`. |
| Cloud-only STT/TTS/LLM baseline | Breaks offline requirement and weakens privacy guarantees. | Local-first inference with optional cloud features as opt-in add-ons. |

## Stack Patterns by Variant

**If target machine has NVIDIA GPU:**
- Build `whisper.cpp` and `llama.cpp` with CUDA backends.
- Because this gives the best latency for Assistant mode while preserving CPU fallback.

**If target machine is Windows laptop/iGPU-heavy:**
- Prefer Vulkan first for cross-vendor acceleration; use CPU fallback automatically.
- Because it avoids vendor lock-in and keeps portability to Linux/macOS builds.

**If machine is CPU-only or low-memory:**
- Use smaller quantized models (`Whisper base/small`, low-bit GGUF for LLM).
- Because dictation responsiveness matters more than maximal model quality in MVP.

**If cloud history is enabled:**
- Encrypt records client-side with a key derived/stored through Stronghold before upload.
- Because optional cloud must not weaken local-first privacy guarantees.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `tauri@2.10.2` | plugin family `2.3.x` | Keep Tauri core + plugins on the same major line (`2.x`) to avoid API/ACL drift. |
| Rust `>=1.77.2` (recommended `1.93.1`) | Tauri plugin ecosystem | Global Shortcut/Shell/SQL/Stronghold plugins document `1.77.2` minimum. |
| `kokoro-onnx@0.5.0` | `onnxruntime(‑gpu)@1.24.1` | Kokoro ONNX targets ONNX Runtime; keep runtime modern for provider fixes and GPU support. |
| `whisper.cpp v1.8.3` | Silero VAD model `v6.2.0` | `whisper.cpp` documents VAD integration path with Silero model support. |

## Sources

- https://v2.tauri.app/ (official Tauri v2 docs/release pages; verified current 2.x line) - HIGH
- https://v2.tauri.app/concept/inter-process-communication/ (IPC primitives/events/commands) - HIGH
- https://v2.tauri.app/develop/sidecar/ (official sidecar embedding and execution pattern) - HIGH
- https://v2.tauri.app/plugin/global-shortcut/ (global shortcut plugin + Rust minimum) - HIGH
- https://v2.tauri.app/plugin/shell/ (process spawning + capability allowlists) - HIGH
- https://v2.tauri.app/plugin/sql/ (SQLite/sqlx plugin and migration support) - HIGH
- https://v2.tauri.app/plugin/stronghold/ (secret management plugin) - HIGH
- https://github.com/ggml-org/whisper.cpp + releases API (v1.8.3, backend support, VAD docs) - HIGH
- https://github.com/ggml-org/llama.cpp + releases API (b8061, backend support, GGUF workflow) - HIGH
- https://github.com/thewh1teagle/kokoro-onnx + https://pypi.org/project/kokoro-onnx/ (runtime approach + package version) - MEDIUM
- https://pypi.org/project/onnxruntime-gpu/ (GPU runtime version) - HIGH
- https://www.sqlite.org/index.html (SQLite latest release `3.51.2`) - HIGH
- https://github.com/ollama/ollama (REST API on localhost `:11434`, used for exclusion rationale) - HIGH
- https://crates.io/api/v1/crates/interprocess (named-pipe IPC crate version `2.3.1`) - HIGH
- npm registry package metadata (`npm view ...`) for Tauri plugins, React, Vite, TypeScript, Supabase SDK - MEDIUM

---
*Stack research for: local-first desktop voice dictation + assistant (Scribe-Valet)*
*Researched: 2026-02-15*
