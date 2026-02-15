# Project Research Summary

**Project:** Scribe-Valet
**Domain:** Local-first desktop voice dictation + assistant (IPC-only internals)
**Researched:** 2026-02-15 (revised)
**Confidence:** HIGH for product-fit architecture, MEDIUM-HIGH for exact implementation details

## Executive Summary

Scribe-Valet should ship as an Electron desktop app with a strict IPC-only internal runtime and isolated workers for STT, LLM, TTS, tools, and model management. The critical behavior is consistent with the source brief: fast hotkey dictation with immediate fallback safety, plus a stable assistant mode with transparent tool usage and no hidden actions.

The cloud model is optional login only: Convex storage behind WorkOS AuthKit. When logged out, no remote history is written. Audio is never uploaded.

## Key Findings

### Stack Direction

- **Shell:** Electron (project decision)
- **Inference:** `whisper.cpp` + `llama.cpp` + lightweight local TTS
- **Internal comms:** named pipes/stdin-stdout only, no localhost HTTP
- **Storage:** SQLite for settings/model/runtime metadata (not default logged-out history store)
- **Optional cloud:** Convex + WorkOS AuthKit

### Product-Critical Defaults

- Dictation mode is narrow and predictable by default:
  - tools off by default
  - only clipboard + optional selected-text context
- Assistant mode is broader by default:
  - clipboard + selected-text context when available
  - optional allowlisted tools with deterministic call schema

### Risk Areas to Front-Load

1. Audio-path latency discipline (no blocking work in capture path).
2. IPC boundary hardening (sender validation + versioned contracts).
3. Deterministic tool runner (allowlists, schema validation, replayable logs).
4. Model lifecycle safety (integrity checks, predictable fallback behavior).

## Implications for Roadmap

Roadmap should keep this execution logic:

1. Runtime guardrails and IPC resilience first.
2. Model lifecycle and hardware routing before feature depth.
3. Dictation trust loop before assistant breadth.
4. Tool governance before wider automation.
5. Optional cloud sync last, with login-gated writes.

## Consistency Notes (Resolved)

- Previous summary referenced Tauri-first architecture; revised to Electron-first.
- Previous summary implied transcript persistence in SQLite by default; revised to metadata-only local storage policy for logged-out mode.
- Previous summary used generic optional sync assumptions; revised to Convex + WorkOS AuthKit explicitly.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack fit to product constraints | HIGH | Aligns with explicit no-ports, offline-first, and Electron preference. |
| Feature coverage vs source brief | HIGH | Dictation, assistant, tools, onboarding, model lifecycle, and optional cloud are fully represented. |
| Implementation detail readiness | MEDIUM-HIGH | Some runtime specifics still require phase-level validation and benchmarks. |

---
*Research completed: 2026-02-15 (revised)*
*Ready for roadmap/planning: yes*
