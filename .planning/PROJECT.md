# Scribe-Valet

## What This Is

Scribe-Valet is a local-first desktop voice utility with two core modes: Dictation and Assistant. It lets users trigger hotkeys to speak, transcribe speech locally, and either paste cleaned text anywhere (Dictation) or get spoken AI responses with optional tool use (Assistant). The product is built to feel plug-and-play on Windows first, with architecture that ports cleanly to macOS and Linux.

## Core Value

A user can reliably speak, get high-quality local AI output quickly, and use it immediately without running servers, opening ports, or depending on cloud services.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Dictation mode captures via hotkey, transcribes locally, enriches text quickly, and pastes into the focused input with clipboard backup.
- [ ] Dictation mode defaults to no tools and narrow context (clipboard plus optional selected text) for predictable, low-risk behavior.
- [ ] Assistant mode supports hotkey-driven voice turns, local STT+LLM+TTS, short conversations, and clear spoken responses.
- [ ] Internal architecture uses IPC only (pipes/named pipes), with no localhost HTTP or open ports.
- [ ] Hardware-aware runtime supports Auto/CPU/GPU device selection with graceful CPU fallback.
- [ ] User-defined Python tools load safely with deterministic invocation and per-mode allowlists.
- [ ] First-launch onboarding configures optional login, model preset, hotkeys, and behavior characteristics.
- [ ] Model lifecycle is managed locally (presence checks, one-time downloads, integrity verification, clean storage layout).
- [ ] Optional cloud history sync stores text artifacts only when logged in; no audio is uploaded.
- [ ] Optional cloud history uses Convex with WorkOS AuthKit login, and does not store anything remotely while logged out.

### Out of Scope

- Dockerized or multi-service deployment orchestration — conflicts with plug-and-play local-first UX.
- Internal HTTP/localhost microservices — violates no-ports security and simplicity requirement.
- External agent offloading, MCP gateways, and webhook endpoints in v1 — anticipated in architecture but deferred.
- Rich multi-agent autonomy and long-running conversations in v1 — prioritize stable, understandable assistant behavior first.

## Context

This project starts from a detailed pre-execution research brief focused on a practical, local-first dictation + assistant desktop app. The stack direction is Whisper via `whisper.cpp` for STT, `llama.cpp` for local LLM inference, and lightweight local TTS (for example Kokoro ONNX), with model-warm strategies for latency. Product behavior emphasizes fast dictation cleanup, predictable assistant tool behavior, and transparent logging of tool actions. The app should be tray-first with a compact window for chat/history/settings, and should keep dependencies minimal while still handling broad hardware variability.

## Constraints

- **Architecture**: IPC-only internal communication (named pipes/pipes, versioned handshake) — no open network ports.
- **Compatibility**: Windows-first delivery with clean portability path to macOS/Linux — avoid OS-specific lock-in where possible.
- **Performance**: Dictation must feel near-instant from stop cue to paste — optimize prompts, context, and output size.
- **Reliability**: Must always run on CPU when GPU acceleration is unavailable — graceful fallback is mandatory.
- **Security**: Explicit tool allowlists, transparent tool logging, and local-first secret handling — minimize attack surface.
- **Product Scope**: Offline-first baseline with optional cloud history only — core UX cannot depend on login or internet.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Two-mode product split (Dictation + Assistant) | Separates fast text insertion from broader conversational behavior and tool access | — Pending |
| IPC-only runtime architecture (no HTTP/ports) | Reduces attack surface, avoids port conflicts, enforces local utility simplicity | — Pending |
| Electron desktop shell | Preferred project runtime for packaging consistency and team velocity | — Pending |
| Local STT/LLM/TTS baseline with optional cloud history | Preserves offline usability and privacy while allowing optional sync value | — Pending |
| Convex + WorkOS AuthKit for optional sync | Aligns cloud history implementation with explicit product decision and keeps login optional | — Pending |
| User-defined Python tools with per-mode allowlists | Enables extensibility while constraining risk and hidden actions | — Pending |
| Hardware-aware onboarding presets (Light/Balanced/Power) | Aligns default model choices with user machine capability and UX expectations | — Pending |

---
*Last updated: 2026-02-15 after initialization*
