# Roadmap: Scribe-Valet

## Overview

Scribe-Valet v1 is sequenced to establish local-only runtime trust first, then deliver dictation and assistant experiences, then layer safe extensibility and optional cloud sync. The roadmap follows requirement dependencies so each phase produces a complete user-visible capability and unblocks the next phase. By the end of v1, users can run fully offline for core workflows, with optional text-only sync when logged in.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Runtime Guardrails and IPC Backbone** - Local runtime stays no-ports and recovers from worker failures.
- [ ] **Phase 2: Model and Storage Lifecycle** - Model assets are checked, downloaded, verified, and stored predictably.
- [ ] **Phase 3: Device Selection and Fallback Behavior** - Compute routing is user-controllable with reliable CPU fallback.
- [ ] **Phase 4: Dictation Capture and Local Transcription** - Hotkey-to-transcript flow works offline with microphone control.
- [ ] **Phase 5: Dictation Enrichment and Output Reliability** - Dictation output is cleaned, inserted, and recoverable on failure.
- [ ] **Phase 6: Assistant Voice Turns and Short History** - Local STT->LLM->TTS assistant loop works with in-app history.
- [ ] **Phase 7: Safe Tools and Guided Configuration** - Onboarding/settings and deterministic per-mode tools are trustworthy.
- [ ] **Phase 8: Optional Cloud History Sync** - Logged-in users can sync text history without uploading audio.

## Phase Details

### Phase 1: Runtime Guardrails and IPC Backbone
**Goal**: Users can run Scribe-Valet with IPC-only internals and resilient worker lifecycle behavior.
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01, ARCH-02
**Success Criteria** (what must be TRUE):
  1. User can run the app without any localhost HTTP services or open internal API ports.
  2. If a worker crashes during use, the app recovers worker connectivity automatically so the user can continue without relaunching.
  3. Incompatible worker handshake/version combinations are rejected with a clear recovery path instead of undefined behavior.
**Plans**: 8 plans

Plans:
- [x] 01-01-PLAN.md - Bootstrap IPC-only runtime shell and localhost guardrails.
- [x] 01-02-PLAN.md - Implement worker supervision, handshake gating, and auto-retry lifecycle.
- [x] 01-03-PLAN.md - Deliver recovery and mismatch UX with locked human-tone messaging.
- [x] 01-04-PLAN.md - Add local-only trust badge and privacy runtime checks diagnostics.
- [x] 01-05-PLAN.md - Close UAT boot/guardrail gaps and re-validate trust-flow checks.
- [x] 01-06-PLAN.md - Wire live supervisor/runtime recovery flow and refresh verification/UAT evidence.
- [x] 01-07-PLAN.md - Close diagnosed restart-app relaunch semantics gap from UAT mismatch recovery.
- [x] 01-08-PLAN.md - Close renderer crash continuity gap that leaves a persistent blank window after renderer-process failure.

### Phase 2: Model and Storage Lifecycle
**Goal**: Users have a predictable local model lifecycle with integrity checks and clear storage layout.
**Depends on**: Phase 1
**Requirements**: MODL-01, MODL-02, MODL-03
**Success Criteria** (what must be TRUE):
  1. At startup, user sees whether required model files are present in the configured model directory.
  2. Missing model artifacts download once, pass integrity verification, and become usable without manual file copying.
  3. Models, config, tools, and logs are stored in clearly separated directories with OS defaults and user override support.
**Plans**: TBD

Plans:
- [ ] 02-01: TBD during phase planning

### Phase 3: Device Selection and Fallback Behavior
**Goal**: Users can control compute device policy while keeping reliable execution on CPU-capable systems.
**Depends on**: Phase 2
**Requirements**: HARD-01, HARD-02
**Success Criteria** (what must be TRUE):
  1. User can select Auto, CPU, GPU-0, or GPU-1 (when available), and the chosen policy persists.
  2. If GPU acceleration is unavailable for a requested run, the app falls back to CPU and completes the user action.
  3. In Auto mode, user can see which compute device was selected for execution.
**Plans**: TBD

Plans:
- [ ] 03-01: TBD during phase planning

### Phase 4: Dictation Capture and Local Transcription
**Goal**: Users can capture dictation via hotkey and get local transcripts while offline.
**Depends on**: Phase 3
**Requirements**: DICT-01, DICT-02, DICT-03, DICT-04, DICT-05, DICT-06
**Success Criteria** (what must be TRUE):
  1. User can start and stop dictation from a configurable global hotkey.
  2. User hears an end-of-turn cue immediately when dictation capture stops.
  3. User speech is transcribed locally without internet access.
  4. User can select a microphone in settings and the next capture uses that device.
  5. Dictation mode starts with tools disabled by default and only narrow context available (clipboard plus optional selected text).
**Plans**: TBD

Plans:
- [ ] 04-01: TBD during phase planning

### Phase 5: Dictation Enrichment and Output Reliability
**Goal**: Users can trust dictation output to be polished, inserted, and recoverable.
**Depends on**: Phase 4
**Requirements**: ENRH-01, ENRH-02, ENRH-03, OUTP-01, OUTP-02, OUTP-03
**Success Criteria** (what must be TRUE):
  1. User dictation is automatically cleaned for punctuation/casing and light rewrite while preserving meaning.
  2. If enrichment fails or times out, user still receives raw transcript output that is pasted and copied.
  3. Final dictation is inserted into the focused text field and copied to clipboard.
  4. If insertion fails, user can recover the most recent dictation output.
**Plans**: TBD

Plans:
- [ ] 05-01: TBD during phase planning

### Phase 6: Assistant Voice Turns and Short History
**Goal**: Users can complete short assistant voice turns with local generation and spoken responses.
**Depends on**: Phase 3
**Requirements**: ASST-01, ASST-02, ASST-03, ASST-04, ASST-05, ASST-06
**Success Criteria** (what must be TRUE):
  1. User can trigger assistant voice interaction with configurable push-to-talk or toggle behavior.
  2. Assistant requests are transcribed locally and answered by a local LLM.
  3. User hears assistant responses through local TTS in each completed turn.
  4. User can review short assistant conversation history in the app UI.
  5. Assistant mode includes broader default context (clipboard and selected text where available).
**Plans**: TBD

Plans:
- [ ] 06-01: TBD during phase planning

### Phase 7: Safe Tools and Guided Configuration
**Goal**: Users can safely configure product behavior and tool access with deterministic, transparent execution.
**Depends on**: Phase 6
**Requirements**: TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-05, TOOL-06, ONBD-01, ONBD-02, ONBD-03, ONBD-04, SETT-01
**Success Criteria** (what must be TRUE):
  1. On first launch, user completes onboarding for optional login, model preset recommendation, hotkeys, and behavior/voice settings.
  2. User can edit onboarding choices later through quick and advanced settings.
  3. User can define tools in local Python config and allow/disallow them separately for Dictation and Assistant modes, including Assistant multi-select.
  4. Tool execution uses deterministic structured calls that honor allowlists and prevent hidden actions.
  5. User can see tool invocations and outputs recorded in assistant history/logs.
  6. Tool runtime accepts both sync and async user-defined tools, with synchronous execution as the default.
**Plans**: TBD

Plans:
- [ ] 07-01: TBD during phase planning

### Phase 8: Optional Cloud History Sync
**Goal**: Logged-in users can sync text history while core product remains fully local-first.
**Depends on**: Phase 7
**Requirements**: CLD-01, CLD-02, CLD-03, CLD-04, CLD-05
**Success Criteria** (what must be TRUE):
  1. Logged-in users can sync dictation history containing transcript/enriched text, timestamps, and mode metadata.
  2. Logged-in users can sync assistant history containing turns, tool calls, text outputs, and timestamps.
  3. When user is not logged in, no remote history is stored.
  4. Cloud sync never uploads audio.
  5. Login and sync path is implemented through WorkOS AuthKit and Convex.
**Plans**: TBD

Plans:
- [ ] 08-01: TBD during phase planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Runtime Guardrails and IPC Backbone | 8/8 | Complete | 2026-02-17 |
| 2. Model and Storage Lifecycle | 0/TBD | Not started | - |
| 3. Device Selection and Fallback Behavior | 0/TBD | Not started | - |
| 4. Dictation Capture and Local Transcription | 0/TBD | Not started | - |
| 5. Dictation Enrichment and Output Reliability | 0/TBD | Not started | - |
| 6. Assistant Voice Turns and Short History | 0/TBD | Not started | - |
| 7. Safe Tools and Guided Configuration | 0/TBD | Not started | - |
| 8. Optional Cloud History Sync | 0/TBD | Not started | - |
