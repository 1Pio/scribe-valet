## Scribe-Valet – What To Build

**One-sentence description:** Local-first voice dictation + assistant app: fast transcription with AI cleanup, autocorrect, and writing polish; plus optional workflow actions via user-defined Python tools.

**Project name (subject to change):** Scribe-Valet
**GitHub repo:** `scribe-valet`

Build a desktop application that runs as a compact, plug-and-play utility on the user’s machine, starting on Windows but architected cleanly for macOS and Linux. The app has two modes, both fully functional offline: **Dictation** and **Assistant**. The entire STT + LLM + TTS stack runs locally with minimal dependencies and no “service sprawl.” The user should never have to manage servers, ports, Docker, or orchestration.

### Core modes and behavior

**Dictation Mode (fast, narrow, “types anywhere”)**
The user starts dictation via an editable hotkey. The app captures microphone audio until the same hotkey is pressed again. A sound cue confirms the end of the turn. The app then transcribes speech to text locally, and immediately runs a fast LLM cleanup pass to improve the raw transcript (punctuation, casing, autocorrect, light rewriting) while preserving meaning. After enrichment, the final text is pasted into whatever text field currently has focus and also placed into the system clipboard (so the user can access clipboard history). Dictation mode is intentionally constrained: by default it has **no tools** enabled and only receives narrow context (current clipboard content and optionally selected text). If enrichment fails or times out, the raw transcript should still be pasted and saved locally as a fallback.

**Assistant Mode (talk-back, tool-augmented)**
The user triggers the assistant via a hotkey (push-to-talk or toggle) and speaks a request. The assistant transcribes locally, processes the request with a local LLM, optionally uses allowed tools, and speaks a reply via local TTS. Assistant mode has broader context by default (clipboard + selected text where possible) and can access user-selected tools from the user’s Python tools file. The assistant should be capable but not overly complex in the first version: short conversations, basic reasoning, reliable tool calls, and clear responses. Future capabilities (custom endpoints, webhooks, MCP gateways, external agent offloading) should be anticipated in architecture, but not implemented yet.

### Local-first AI stack and performance targets

Use a fully local stack that remains stable across a wide range of hardware. The app must detect CPU/GPU availability and allow the user to select the compute device (Auto, CPU, GPU-0, GPU-1, etc.). It must gracefully fall back to CPU when acceleration is unavailable and never “randomly installs huge system dependencies.” When a dependency is required (for example, a GPU backend), the app should inform the user clearly and offer actionable guidance.

Recommended baseline stack:

* **STT:** Whisper via `whisper.cpp` with small multilingual models by default, with optional language-specific smaller models where appropriate.
* **LLM:** `llama.cpp` runtime with GGUF models; default model selection is guided by onboarding and hardware.
* **TTS:** Lightweight local TTS (e.g. Kokoro ONNX), with voice selection and adjustable rate.

The app should keep models “warm” to minimize latency. Dictation cleanup must be optimized for speed: short prompts, short outputs, constrained style settings, and minimal context. Assistant responses can take longer but should still feel responsive.

### Tool system (user-defined Python tools)

Tools are defined by the user in a dedicated Python file (path configurable). Tools can be synchronous or asynchronous; synchronous is the default. Scribe-Valet should load tools safely, expose them to the assistant with clear descriptions, and enforce per-mode allowlists:

* Dictation mode: tools off by default; user may enable a narrow subset explicitly.
* Assistant mode: user can multi-select which tools are allowed.

Tool calls should be transparent in logs/history, and the agent’s tool invocation format must be deterministic enough to be reliable (no “random” hidden actions). The tool runner should be designed so it can later connect to local tool gateways (including MCP) without re-architecting the app.

### Architecture and “no ports” rule

Scribe-Valet must not rely on open network ports, localhost servers, or HTTP for internal communication. Any internal separation (for example, UI process + core runtime process) must use **IPC via pipes/named-pipes** (Windows named pipes; Unix domain sockets or pipes on macOS/Linux). This keeps the system secure, reduces attack surface, avoids port collisions, and ensures the user never has to configure networking. Internal IPC must be authenticated/handshaked, versioned, and robust against crashes (automatic restart of the worker process, clear error surfaces, safe shutdown).

### Onboarding and settings UX

On first launch, show a lightweight onboarding flow:

1. **Optional Login**: clearly state that login is optional and only enables cloud sync of text history. The app works fully offline without login. No audio is ever uploaded or stored in the cloud.

2. **Model Size Preset (3 cards)**: Light / Balanced / Power. Before the user chooses, the app runs a quick hardware scan (RAM, VRAM, GPU devices) and labels one preset as “Recommended for your machine.” Each preset describes what it changes (primarily the LLM size class and performance knobs), what will be downloaded, and expected speed/quality.

3. **Hotkeys**: configure dictation hotkey, assistant hotkey, and optional mode-switch hotkey.

4. **Characteristics**: simple “feel” controls (dictation enrichment intensity, assistant reply length, tool autonomy behavior, voice settings).

After onboarding, all choices remain editable in settings: quick settings for common toggles and an advanced settings section for model selection, directories, device selection, context limits, tool permissions, diagnostics/logs, and future endpoint configuration (not implemented now).

### Model management and storage layout

Scribe-Valet should manage models automatically:

* On startup, check for required model files in the configured model directory.
* If missing, download once and verify integrity (checksum/ETag). Never re-download unnecessarily.
* Store everything under a clean, human-readable directory structure (models, config, tools, logs separated).
* Provide sensible defaults per OS (Windows AppData; macOS Application Support; Linux XDG config), but let users override paths.

### Optional cloud history (Convex + AuthKit)

Cloud features are strictly optional. If the user logs in, the app stores:

* Dictations: raw transcript + enriched text, timestamps, mode metadata.
* Assistant conversations: turns, tool calls, tool outputs (as text), timestamps.

If the user is not logged in, nothing is stored remotely. Audio is never stored. Tool secrets and the Python tools file are local by default; syncing tools is off by default and opt-in.

### UI design direction

The UI should feel like an OpenAI-style product: clean, calm, minimal, with a controlled splash of color and personality. Design is not the priority over correctness, security, and performance, but the UI must still be pleasant and modern. Use base UI patterns, Tailwind, shadcn components, and a cohesive icon set that fits that ecosystem. Prefer a tray-first experience with a compact window for chat/history/settings. Keep the interface fast, uncluttered, and predictable.

### Non-negotiables and quality bar

* Fully usable offline.
* No Docker, no user-managed services, no ports.
* IPC-only internal wiring (pipes/named-pipes).
* Clear security boundaries: explicit tool allowlists, transparent tool actions, minimal attack surface.
* Hardware-aware defaults: always works on CPU; accelerates when GPU is available; never surprises users with heavy installs.
* Dictation feels instant: fast capture, fast STT, fast cleanup, reliable paste.
* Assistant feels stable: understandable behavior, consistent responses, no hidden actions.

This is the build: a lightweight, local-first, hotkey-driven dictation and assistant utility that feels effortless to install and use, yet remains extensible via Python tools and optional cloud history when the user chooses it.
