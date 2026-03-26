# Scribe Valet: Initial North-Star (Pre-Execution Truth)

Date: 2026-03-05  
Status: Baseline architecture intent (source-checked)  
Scope: One product, one runtime path, all inference local to web/electron app runtime

## Decision log (confirmed 2026-03-05)

1. COOP/COEP is not a v1 requirement. Priority is that web + Electron both work now with near-synced behavior.
2. No hard global model-download size cap. User explicitly selects a stack/card and the app downloads that stack's artifacts.
3. Do not enforce strict offline/local-only network blocking in v1. Network remains available for model changes and future account/sync features.
4. Encryption at rest is out of scope for v1. First finalize practical storage architecture for settings and dictation history.
5. Electron model artifacts are always downloaded post-install (not bundled). Onboarding must support background model download with visible progress.
6. TTS default policy: system local voices first; Kokoro is the recommended neural voice pack and becomes default after installation.
7. Global system-wide shortcuts are Electron-only in v1.
8. Latency targets are locked as adaptive SLOs (partial cadence, commit timing, warm/cold expectations).
9. Storage eviction budgets are locked by profile tier, with Electron artifacts under AppData userData.
10. CI/e2e must fail on unexpected network/audio egress after allowed phases.
11. Public web browser minimums are split into baseline compatibility and accelerated WebGPU support tiers.
12. Electron should target the best-fitting Chromium, preferably the latest stable available in the chosen Electron release line.

## 1) Product truth and non-negotiables

This project is built around one invariant set:

1. One product and one codepath for web + Electron.
2. All inference runs locally in-browser/in-renderer after model acquisition.
3. Backend selection is automatic (WebGPU-first, CPU/WASM fallback).
4. User-facing controls are profile cards and feature toggles, not hardware/backend choices.
5. Runtime owns model resolution, caching, warm/hot residency, and fallback behavior.

## 2) System architecture (single runtime boundary)

## App shell

- Web: SPA/PWA shell so route changes do not kill runtime state.
- Electron: one renderer window; only add hidden runtime window if required later.

## Local AI Runtime (Dedicated Worker core)

UI talks to runtime as an internal API:

- `ensureProfile(profileId)`
- `ensureModel(role, familyId)`
- `startDictation()` / `stopDictation()`
- `getPartialTranscript()` / `getCommittedTranscript()`
- `enrich(textDelta)`
- `tts(text)`

Runtime is the only layer aware of:

- Backend: WebGPU vs WASM.
- Model lifecycle: download, hash verify, cache, load/unload.
- Memory/resource policy: budget checks, warm/hot residency, eviction.

## 3) Backend strategy (automatic, not user-facing)

## Backend A (preferred): ONNX Runtime Web + WebGPU

- Use when WebGPU exists (`navigator.gpu`) and model variant supports it.
- For Transformers.js path, use `device: "webgpu"` and let ONNX Runtime Web execute via WebGPU provider.

## Backend B (fallback): CPU/WASM

- ONNX Runtime Web WASM execution provider.
- Optional universal STT fallback: `whisper.cpp` WASM variant for broad compatibility.

Selection policy:

1. Try WebGPU artifact.
2. On incompatibility or OOM, downgrade to quantized/lighter artifact.
3. If still failing, use CPU/WASM artifact chain.
4. Persist result as device-level preference hint (not user-visible).

## 4) Role registry and profile cards

Roles:

- `stt`
- `vad`
- `llm_enrich` (optional)
- `tts` (optional)

Profiles (user-visible):

- Fast and Light
- Balanced
- Best Quality

Toggles:

- Enrichment on/off
- Local neural TTS on/off

Important: profile picks model families and features only. Runtime resolves the best installable artifact per device/backend.

## 5) Model store and warm cache

Use a dual-layer local model store:

- Cache API: straightforward HTTP-response model caching.
- OPFS: robust file-like persistence and streaming-friendly large artifact handling.

Add a manifest per artifact:

```json
{
  "id": "stt-whisper-small",
  "version": "1.2.0",
  "role": "stt",
  "family": "whisper-small",
  "variant": "onnx-webgpu-q8",
  "sizeBytes": 123456789,
  "sha256": "…",
  "urls": ["https://..."],
  "requires": { "webgpu": true, "simd": true, "threads": false },
  "fallbackOrder": ["onnx-webgpu-q8", "onnx-wasm-q8", "whispercpp-wasm-q5"]
}
```

Eviction policy:

1. Keep active profile artifacts hot.
2. Keep recent profile artifacts warm.
3. Evict least-recently-used artifacts when quota pressure is reached.
4. Never keep unverified artifacts (hash mismatch => purge + redownload).

## 6) Real-time dictation pipeline (simple, strong)

## Capture + normalize

- Mic capture in audio pipeline.
- Resample to 16kHz for Whisper-family input.

## VAD gating

- Silero VAD over short frames.
- Hysteresis guardrails:
  - speech start: probability above threshold for short sustain window
  - speech end: probability below threshold for longer sustain window

## Sliding partial STT

- Maintain rolling buffer (roughly 12-18s).
- Every ~0.8-1.2s during active speech:
  - take trailing context (~6-10s)
  - pad to 30s for Whisper-family behavior
  - infer and emit partial tail

## Commit and finalize

- Commit text when end-of-speech or transcript tail stabilizes across consecutive passes.
- Finalization pass on utterance end:
  - process full utterance in 30s windows with overlap
  - merge overlap text to avoid cut words

UI contract:

- committed transcript (stable)
- live tail (mutable)

## 7) Optional modules

## Enrichment

- WebGPU-capable devices: WebLLM local enrichment.
- CPU-only default: enrichment off or lightweight rules mode.

## TTS

Two-tier local strategy (v1 locked default):

1. System TTS (`SpeechSynthesis`) filtered to local voices (`localService === true`) when available.
2. Kokoro neural local TTS pack (initial runtime path via `kokoro-js`/WASM for compatibility).

Default resolver:

1. If Kokoro pack installed and healthy: use Kokoro as default voice path.
2. Otherwise: use system local voice path.
3. Never auto-select non-local remote system voices.

Future optimization path:

- Add optional ONNX/WebGPU Kokoro route later if performance warrants it.

## 8) Security and reliability guardrails

## Web

1. HTTPS only (required secure context for key APIs).
2. COOP/COEP is optional in v1; treat as a performance upgrade path for stronger WASM threading/perf and advanced memory measurement.
3. Service Worker offline strategy for shell + model assets.

## Electron (must-have hardening)

1. `nodeIntegration: false`
2. `contextIsolation: true`
3. `sandbox: true`
4. `webSecurity: true`

Electron-specific v1 behavior:

- Model artifacts and managed caches persist under `app.getPath("userData")/artifacts/`.
- Global hotkeys are registered in main process only.

## Supply chain and integrity

1. Self-host model artifacts and critical JS bundles.
2. Pin versions.
3. Verify hashes before activation.
4. Default no analytics/no telemetry in local-only mode.

Non-negotiable privacy invariant:

- Audio must never leave the device. This remains true even when general network access is enabled.

## 9) Feasibility against 9 target claims

1. Fully local: yes after model acquisition; offline possible with cached assets.
2. Safe/secure: yes if web + Electron guardrails above are enforced.
3. Compact in-site runtime: yes (UI + workers + local storage + SW).
4. Auto CPU/GPU + memory-aware: yes, with heuristic budgets and fallback (not exact VRAM telemetry).
5. Profile-based stack switching + recommendations: yes.
6. Easy but strong chunking/real-time feel: yes with VAD + sliding windows + finalize pass.
7. Secure raw/enriched transcript storage: yes with IndexedDB/OPFS + optional WebCrypto layer.
8. Broad device coverage: yes with fallback lane; low-end performance remains bounded by hardware.
9. Build readiness: yes, contingent on hosting/security/storage guardrails.

Interpretation for v1:

- "Fully local" means local inference and local audio processing, not permanent network prohibition.
- Network is allowed for artifact downloads, app updates, and future optional account features.

## 10) Immediate lock-ins (implementation order)

1. Worker-based Local AI Runtime boundary and message protocol.
2. Silero VAD integration and utterance segmentation.
3. Primary STT: Transformers.js Whisper with WebGPU path.
4. Fallback STT: whisper.cpp WASM lane.
5. Model storage manager (Cache API + OPFS + manifest + eviction).
6. Optional modules after core quality gates: WebLLM enrichment, ONNX TTS.

## 11) Storage direction for v1 (aligned decisions)

Settings + metadata:

- Use IndexedDB as primary local structured store in both web and Electron renderer contexts.
- Keep schema versioned for migration to future account-based cloud sync.

Dictation history:

- Store transcript metadata and text in IndexedDB.
- Keep optional larger attachments/blobs in OPFS (web) or file-backed storage bridged by Electron runtime.

Model artifacts:

- Web build: browser-managed storage stack (Cache API + OPFS where applicable).
- Electron build: persist artifacts under `app.getPath("userData")/artifacts/` via runtime download manager.

Eviction budgets (default by selected profile):

- Fast and Light: 1.5 GB
- Balanced: 4 GB
- Best Quality: 10 GB

Eviction order:

1. Temporary audio buffers.
2. Unused model variants (old quantizations/backend variants).
3. Unused voice packs.
4. Optional enrichment caches.
5. Transcript history is never auto-evicted by default (user-controlled retention only).

Persistence model:

- Unencrypted at rest for v1.
- Future-compatible schema and IDs for eventual optional cloud sync.

## 12) Onboarding + model install behavior (v1)

1. Onboarding includes 2-3 slides, with early model stack/card selection.
2. After selection, start artifact downloads immediately in background.
3. Show persistent progress UI (e.g., bottom download bar) while user continues onboarding/settings/navigation.
4. If user changes stack later, runtime queues missing artifacts and updates active profile when minimum required set is ready.

## 13) Electron global shortcuts (v1)

System-wide shortcuts are supported only in Electron:

1. Push-to-talk (hold): `Ctrl/Command + Shift + Space`
2. Dictation toggle: `Ctrl/Command + Shift + D`
3. Paste last output: `Ctrl/Command + Shift + V`

Paste-last behavior:

- Always copy transcript/output to clipboard.
- Optional auto-paste (user setting): synthesize paste key chord into active app.
- If auto-paste disabled or unavailable, clipboard write still succeeds and user is notified.

## 14) Latency SLOs (v1)

Adaptive targets:

1. Partial/live-tail updates: every 0.8-1.2s while speaking (degrade up to 2.0s on constrained hardware).
2. Commit after end-of-speech: <= 0.8s for initial commit.
3. Optional refinement pass after commit: <= 2.5s.
4. Warm start (artifacts present): <= 1.0s to usable state.
5. Cold start (first download): no fixed time SLO; must show accurate progress and resume support.

## 15) Locality assurance tests (v1)

Required:

1. Add local-only test mode that blocks unexpected outbound connections after allowed model-download phase.
2. Add Playwright e2e network assertions that fail on unexpected requests in local runtime operation.
3. Add Electron main-process request guardrails for deny-by-default in local-runtime paths.
4. Add explicit "audio egress prevention" test cases to CI and treat failures as blocking.

## 16) Public web minimum browser policy (locked)

Support is declared in two tiers to match one codepath with automatic backend selection.

Tier 1 (baseline compatibility: CPU/WASM + OPFS + AudioWorklet):

1. Chrome/Edge: 108+
2. Firefox: 111+
3. Safari (macOS + iOS): 16.4+

Tier 2 (accelerated path: WebGPU when available):

1. Chrome/Edge desktop: 113+
2. Chrome Android: 121+ (Android 12+ on supported GPUs)
3. Firefox: 141+ (Windows rollout path)
4. Safari: 26+ (keep CPU fallback strong due to platform variance)

Execution note:

- Runtime behavior remains feature-detected at runtime (`navigator.gpu`, capability probes), with automatic fallback to CPU/WASM.

## 17) Electron runtime policy (locked)

1. Electron app is the preferred distribution target.
2. Electron runtime should stay on the best-fitting Chromium, with preference for latest stable supported by the chosen Electron line.
3. All web and Electron logic should remain as synchronized as possible through a shared runtime boundary.

## 18) Questions to resolve before execution

No open architectural blockers remain in this north-star note. Detailed implementation tasks and acceptance tests can now be derived from these locked decisions.

## 19) Sources (primary)

- ONNX Runtime Web (WebGPU EP): https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- Transformers.js WebGPU usage: https://huggingface.co/docs/transformers.js/en/guides/webgpu
- Chrome model caching guidance: https://developer.chrome.com/docs/ai/cache-models
- OPFS overview (MDN): https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- Cross-origin isolation guidance: https://web.dev/articles/coop-coep
- Electron security tutorial: https://www.electronjs.org/docs/latest/tutorial/security
- SpeechSynthesis local voice flag: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService
- Silero VAD package: https://github.com/ricky0123/vad
- WebLLM docs: https://webllm.mlc.ai/docs/
- IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- whisper.cpp WASM example repo: https://github.com/timur00kh/whisper.wasm
- faster-whisper repo (CTranslate2 context): https://github.com/SYSTRAN/faster-whisper
- Electron globalShortcut: https://www.electronjs.org/docs/latest/api/global-shortcut
