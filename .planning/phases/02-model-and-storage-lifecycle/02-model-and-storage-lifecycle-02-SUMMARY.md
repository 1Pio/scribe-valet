---
phase: 02-model-and-storage-lifecycle
plan: 02
subsystem: model-lifecycle
tags: [models, downloads, resume, sha256, integrity]

requires:
  - phase: 01-runtime-guardrails-and-ipc-backbone
    provides: Main-process ownership and deterministic runtime control patterns
provides:
  - Required STT/LLM/TTS bundle manifest with stable IDs and UI-friendly labels
  - Stage-verify-promote installer with resume metadata and validator-aware range requests
  - Focused tests for relaunch resume, checksum rejection, and deterministic failure hints
affects: [phase-02-plan-03, readiness-orchestration, download-modal]

tech-stack:
  added: []
  patterns: [stage-verify-promote, json-resume-metadata, validator-aware-resume]

key-files:
  created:
    [
      src/main/model-lifecycle/model-manifest.ts,
      src/main/model-lifecycle/integrity.ts,
      src/main/model-lifecycle/download-resume-store.ts,
      src/main/model-lifecycle/artifact-installer.ts,
      src/main/model-lifecycle/download-resume-store.test.ts,
      src/main/model-lifecycle/artifact-installer.test.ts
    ]
  modified: [src/main/model-lifecycle/artifact-installer.ts]

key-decisions:
  - "Keep manifest scope fixed to the required bundle with stable artifact IDs and user-facing progress labels."
  - "Resume downloads only with validator-aware semantics (Range plus If-Range) and force full restart on 200/416 responses."
  - "Treat checksum mismatch as terminal for current partial data by clearing resume metadata and blocking promotion."

patterns-established:
  - "Installer always writes to .partial, verifies SHA-256, then atomically renames into active location."
  - "Failure diagnostics include stable code and hint fields to support retry-policy decisions in later plans."

duration: 7 min
completed: 2026-02-17
---

# Phase 2 Plan 2: Resumable Artifact Installer Summary

**Model artifact installation now uses a required-bundle manifest plus resumable stage-verify-promote downloads that only activate files after SHA-256 integrity verification.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-17T15:27:01Z
- **Completed:** 2026-02-17T15:34:04Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added a deterministic required model bundle manifest for STT, LLM, and TTS artifacts with stable IDs, display names, and checksum metadata.
- Implemented installer mechanics for staged `.partial` downloads, validator-aware resume (`Range` + `If-Range`), streamed SHA-256 verification, and atomic promotion.
- Added targeted edge-case coverage for relaunch resume, validator mismatch restart behavior, checksum rejection, resume metadata lifecycle, and deterministic diagnostics hints.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define required model bundle manifest and artifact descriptors** - `3e17984` (feat)
2. **Task 2: Build stage-verify-promote installer with resume-aware range semantics** - `570ce1b` (feat)
3. **Task 3: Add focused test coverage for resume and integrity edge cases** - `c238f23` (test)

## Files Created/Modified
- `src/main/model-lifecycle/model-manifest.ts` - Required bundle manifest and artifact descriptors with UI-facing labels.
- `src/main/model-lifecycle/integrity.ts` - Streamed SHA-256 helpers for artifact verification.
- `src/main/model-lifecycle/download-resume-store.ts` - Atomic JSON persistence for partial-download resume metadata.
- `src/main/model-lifecycle/artifact-installer.ts` - Stage-download, validator-aware resume, integrity checks, and atomic promote flow.
- `src/main/model-lifecycle/download-resume-store.test.ts` - Resume store persistence and invalid-entry sanitization tests.
- `src/main/model-lifecycle/artifact-installer.test.ts` - Resume/restart/integrity/failure-hint behavior coverage.

## Decisions Made
- Scoped this plan to a fixed required bundle manifest (no model-group management) to align with deferred phase boundaries.
- Persisted ETag/Last-Modified validators alongside partial file metadata and only used strong validators for `If-Range` where available.
- Classified installer failures with stable `code` and `hint` diagnostics to keep downstream retry policy behavior deterministic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Handle 416 range responses by restarting full download**
- **Found during:** Task 3 (resume and integrity edge-case testing)
- **Issue:** Resume flow treated HTTP 416 as a hard failure, which could block recovery when partial bytes no longer matched server state.
- **Fix:** Updated installer fallback logic to restart full download on `200` or `416` after a resume attempt.
- **Files modified:** `src/main/model-lifecycle/artifact-installer.ts`, `src/main/model-lifecycle/artifact-installer.test.ts`
- **Verification:** `npm run test -- src/main/model-lifecycle/artifact-installer.test.ts src/main/model-lifecycle/download-resume-store.test.ts`
- **Committed in:** `c238f23` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix tightened resume correctness and prevented unnecessary manual recovery; no scope creep.

## Authentication Gates
None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Installer and manifest primitives are in place for lifecycle orchestration wiring in `02-03-PLAN.md`.
- Resume metadata and deterministic diagnostics are ready for policy-layer retry/orchestration consumption.

## Self-Check: PASSED

- Verified summary and key output files exist on disk.
- Verified task commits exist: `3e17984`, `570ce1b`, `c238f23`.
