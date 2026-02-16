---
phase: 01-runtime-guardrails-and-ipc-backbone
plan: 07
subsystem: runtime
tags: [electron, ipc, relaunch, preload, uat]

requires:
  - phase: 01-runtime-guardrails-and-ipc-backbone
    provides: runtime recovery/mismatch wiring and supervisor action channels from plans 01-03 and 01-06
provides:
  - Dedicated app relaunch semantics for runtime:restart-app using Electron relaunch APIs
  - Restart-app IPC contract separated from RuntimeStatus with strict relaunch-intent validation
  - Closed UAT mismatch restart gap with focused regression evidence
affects: [phase-01-verification, runtime-recovery-actions, preload-runtime-bridge]

tech-stack:
  added: []
  patterns:
    - Recovery actions are semantically split: fix-now/retry refresh supervisor, restart-app triggers process relaunch intent
    - Restart IPC payloads crossing preload use explicit shape guards instead of RuntimeStatus reuse

key-files:
  created: []
  modified:
    - src/main/index.ts
    - src/main/ipc/runtime-controller.ts
    - src/main/ipc/runtime-controller.test.ts
    - src/preload/runtime-status-bridge.ts
    - src/preload/runtime-status-bridge.test.ts
    - src/renderer/app/AppShell.tsx
    - .planning/phases/01-runtime-guardrails-and-ipc-backbone/01-UAT.md

key-decisions:
  - "Route runtime:restart-app through app.relaunch()+app.exit(0) and keep fix-now/retry as supervisor restarts."
  - "Model restart-app as relaunch-intent acknowledgment payload instead of RuntimeStatus to avoid semantic conflation."
  - "Treat UAT Test 3 as closed based on runtime validation plus focused main/preload/renderer test evidence."

patterns-established:
  - "Action-contract split: not every recovery action returns RuntimeStatus; restart paths can return intent acknowledgments."
  - "Renderer restart handlers should fire-and-forget relaunch actions and not mutate local runtime state from restart responses."

duration: 3 min
completed: 2026-02-16
---

# Phase 1 Plan 07: Restart-App Relaunch Closure Summary

**Mismatch recovery now uses a true Electron relaunch path for `Restart app` while preserving in-place supervisor recovery for `Fix now` and `Try again`.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T18:30:23Z
- **Completed:** 2026-02-16T18:33:42Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added a dedicated `restartApplication()` path in main that emits relaunch intent and exits after scheduling `app.relaunch()`.
- Updated runtime controller/preload/renderer contracts so `restartApp` is no longer treated as an in-place `RuntimeStatus` refresh.
- Re-ran runtime validation and focused regression tests, then updated UAT to close diagnosed Test 3 restart gap.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement true app relaunch semantics for runtime:restart-app in main** - `a3fa839` (feat)
2. **Task 2: Update preload and renderer restart-app contract to match relaunch intent** - `e3b88bb` (feat)
3. **Task 3: Re-run focused regression checks and update UAT diagnosis to closed** - `b190774` (docs)

**Plan metadata:** Pending docs commit for SUMMARY/STATE updates.

## Files Created/Modified
- `src/main/index.ts` - Routes restart-app to `app.relaunch()` + controlled exit and keeps fix/retry on supervisor restart.
- `src/main/ipc/runtime-controller.ts` - Defines restart-app action result as relaunch intent payload.
- `src/main/ipc/runtime-controller.test.ts` - Verifies restart-app handler returns dedicated relaunch-intent contract.
- `src/preload/runtime-status-bridge.ts` - Validates restart-app payload as strict relaunch intent result.
- `src/preload/runtime-status-bridge.test.ts` - Adds restart payload validation and malformed payload rejection coverage.
- `src/renderer/app/AppShell.tsx` - Treats restart-app as fire-and-forget relaunch action, not RuntimeStatus update.
- `.planning/phases/01-runtime-guardrails-and-ipc-backbone/01-UAT.md` - Marks Test 3 pass and clears diagnosed gap with updated recheck evidence.

## Decisions Made
- Split restart action semantics at contract level so user-facing `Restart app` can represent process relaunch behavior unambiguously.
- Kept fix-now/try-again supervisor restart behavior unchanged to preserve fast in-place recovery semantics.
- Kept UAT scope focused on the diagnosed mismatch restart gap and left unrelated skipped trust-state check unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 1 diagnosed mismatch restart gap is closed with code/test/UAT evidence.
- Ready for phase completion verification and transition.

## Self-Check: PASSED
- FOUND: `.planning/phases/01-runtime-guardrails-and-ipc-backbone/01-07-SUMMARY.md`
- FOUND: `a3fa839`
- FOUND: `e3b88bb`
- FOUND: `b190774`

---
*Phase: 01-runtime-guardrails-and-ipc-backbone*
*Completed: 2026-02-16*
