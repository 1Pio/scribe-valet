---
phase: 02-model-and-storage-lifecycle
plan: 03
subsystem: model-lifecycle
tags: [electron, model-lifecycle, retries, diagnostics, ipc]
requires:
  - phase: 02-model-and-storage-lifecycle
    provides: storage topology resolution, required model bundle manifest, artifact installer diagnostics
provides:
  - Main-process model lifecycle orchestration service with deterministic startup snapshots
  - Shared lifecycle DTOs and IPC channel contracts for downstream preload/renderer wiring
  - Retry and recovery policy behavior for download and verification failures
affects: [ipc-controllers, preload-bridges, renderer-readiness-ui]
tech-stack:
  added: []
  patterns: [main-process lifecycle source-of-truth, one-time download confirmation gate, transient-only retry expansion]
key-files:
  created:
    - src/shared/types/model-lifecycle.ts
    - src/main/model-lifecycle/model-lifecycle-service.ts
    - src/main/model-lifecycle/model-lifecycle-service.test.ts
  modified:
    - src/shared/protocol/ipc-envelope.ts
key-decisions:
  - "Use a dedicated ModelLifecycleService event source in main process to publish deterministic snapshots."
  - "Keep baseline install retries at 2 automatic retries (3 attempts total) and expand only transient network-class failures to 5 attempts."
  - "Classify partial LLM/TTS loss as degraded mode while keeping Dictation available with raw-output notice when STT is healthy."
patterns-established:
  - "Lifecycle snapshots include compact startup steps, banner escalation metadata, recovery actions, and diagnostics payloads."
  - "Model lifecycle IPC channels follow shared constants in IPC_CHANNELS for get/subscribe/start/retry/change-path/copy-report/confirm-download actions."
duration: 3 min
completed: 2026-02-17
---

# Phase 2 Plan 3: Model lifecycle orchestration summary

**Main-process lifecycle orchestration now computes readiness, mode degradation, and retry/recovery outcomes with shared IPC-facing contracts.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T15:38:19Z
- **Completed:** 2026-02-17T15:41:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added shared lifecycle types that encode startup checklist state, banner escalation markers, setup reasons, mode availability mapping, diagnostics, and ready-toast flags.
- Added lifecycle IPC channel constants for state fetch, subscriptions, startup check trigger, retry, path change, report copy, and download confirmation.
- Implemented `ModelLifecycleService` in main process with startup checks, one-time download confirmation gate, adaptive retry behavior, and recovery action exposure.
- Added focused tests covering healthy startup, partial degradation behavior, transient failure retry expansion, checksum mismatch retry limits, and banner escalation timing.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define shared lifecycle state model and IPC channels** - `1c8d526` (feat)
2. **Task 2: Implement ModelLifecycleService with locked startup and retry behavior** - `9c01697` (feat)

## Files Created/Modified
- `src/shared/types/model-lifecycle.ts` - Shared DTOs for lifecycle snapshots, setup reasons, mode availability, diagnostics, and recovery actions.
- `src/shared/protocol/ipc-envelope.ts` - Added model lifecycle IPC channel constants for controller and bridge wiring.
- `src/main/model-lifecycle/model-lifecycle-service.ts` - Main-process orchestration service for readiness checks, install retries, degradation mapping, and diagnostics persistence.
- `src/main/model-lifecycle/model-lifecycle-service.test.ts` - Unit tests validating deterministic lifecycle transitions and retry policy behavior.

## Decisions Made
- Used `ModelLifecycleService` as a main-process source of truth that emits snapshot updates through a subscription API.
- Implemented retry policy as 3 attempts by default (initial + 2 automatic retries), with expansion to 5 attempts only for transient network/server failures.
- Treated checksum mismatch as deterministic verification failure and disallowed retry-count expansion.
- Kept Dictation available in degraded mode when STT is healthy while blocking Assistant until STT/LLM/TTS are all healthy.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Shared lifecycle contracts and service behaviors are ready for IPC controller integration and preload/renderer state projection in the next plan.
- Retry diagnostics and recovery action payloads are available for UI wiring without additional backend changes.

---
*Phase: 02-model-and-storage-lifecycle*
*Completed: 2026-02-17*

## Self-Check: PASSED
