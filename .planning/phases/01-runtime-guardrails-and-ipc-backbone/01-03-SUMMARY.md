---
phase: 01-runtime-guardrails-and-ipc-backbone
plan: 03
subsystem: ui
tags: [electron, ipc, runtime-status, recovery, mismatch]

requires:
  - phase: 01-02
    provides: runtime lifecycle status stream and recovery thresholds
provides:
  - Narrow preload runtime status bridge with payload validation for status/action channels
  - Timed recovery banner states with delayed and exhausted guidance aligned to locked copy
  - Mismatch recovery panel with fix-first actions, details expander, and copy-report path
affects: [phase-01-plan-05, runtime-status-ui, preload-bridge]

tech-stack:
  added: []
  patterns:
    - Renderer copy mapping is driven by a deterministic state-machine layer
    - Preload bridges validate IPC payloads before exposing renderer-safe API methods

key-files:
  created:
    - src/renderer/runtime-status/MismatchRecoveryPanel.tsx
    - src/renderer/runtime-status/MismatchRecoveryPanel.test.tsx
  modified:
    - src/preload/runtime-status-bridge.ts
    - src/preload/index.ts
    - src/renderer/runtime-status/runtime-state-machine.ts
    - src/renderer/runtime-status/RuntimeRecoveryBanner.tsx
    - src/renderer/app/AppShell.tsx

key-decisions:
  - "Runtime preload bridge now rejects malformed status/report IPC payloads before exposing them to renderer code."
  - "Exhausted recovery messaging emphasizes Restart app first while retaining Try again and Show details as secondary options."
  - "Mismatch recovery shows Restart app fallback only for protocol/version mismatch, not invalid-handshake refresh attempts."

patterns-established:
  - "State-machine copy gates: transient under 3s, gentle delayed copy at threshold, action UI at 9s."
  - "Mismatch UX keeps one human sentence primary and defers technical versions to Details."

duration: 6 min
completed: 2026-02-16
---

# Phase 1 Plan 03: Runtime Recovery and Mismatch UX Summary

**Calm staged runtime recovery messaging and fix-first mismatch guidance now map backend status/timing into human-first UI actions with details kept behind expandable paths.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-16T10:08:19Z
- **Completed:** 2026-02-16T10:14:46Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Exposed runtime status/action APIs from preload with strict payload guards and scoped async methods.
- Refined timed recovery copy so exhausted states emphasize `Restart app` with `Show details` support.
- Added mismatch recovery panel with `Fix now` first, optional `Restart app` fallback, and `Copy report` in Details.
- Verified behavior via targeted task tests, full runtime-status test run, and a successful TypeScript build.

## Task Commits

Each task was committed atomically:

1. **Task 1: Expose runtime status to renderer through narrow preload bridge** - `f5315a4` (feat)
2. **Task 2: Implement recovery state machine with locked timing and human-tone copy** - `44bf117` (feat)
3. **Task 3: Add mismatch guidance panel with recommended-path-first behavior** - `08e2a55` (feat)

## Files Created/Modified
- `src/preload/runtime-status-bridge.ts` - Added runtime status/report payload validation before returning bridge results.
- `src/preload/runtime-status-bridge.test.ts` - Added malformed payload guard tests for invoke and status subscriptions.
- `src/preload/index.ts` - Exposed frozen preload runtime bridge object.
- `src/renderer/runtime-status/runtime-state-machine.ts` - Added restart-priority exhausted mapping and mismatch view-model mapping.
- `src/renderer/runtime-status/RuntimeRecoveryBanner.tsx` - Rendered restart-first ordering when exhausted and reset stale details state.
- `src/renderer/runtime-status/MismatchRecoveryPanel.tsx` - Added fix-first mismatch panel with details and copy-report action.
- `src/renderer/app/AppShell.tsx` - Wired mismatch panel actions into runtime status bridge handlers.

## Decisions Made
- Validated IPC payloads in preload to keep renderer APIs sender-safe and predictable.
- Kept exhausted recovery summary to one non-technical sentence while prioritizing restart.
- Hid mismatch restart fallback for invalid-handshake cases to keep one recommended path first.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added IPC payload validation for runtime status bridge**
- **Found during:** Task 1 (preload bridge work)
- **Issue:** Bridge trusted unknown IPC payload shapes, allowing malformed data to reach renderer consumers.
- **Fix:** Added runtime status and copy-report type guards for invoke responses and status subscriptions.
- **Files modified:** src/preload/runtime-status-bridge.ts, src/preload/runtime-status-bridge.test.ts
- **Verification:** `npm run test -- src/preload/runtime-status-bridge.test.ts`
- **Committed in:** `f5315a4`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Validation hardening stayed within scope and improved correctness/security of the preload boundary.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Runtime recovery copy, actions, and mismatch guidance are now wired for renderer consumption.
- Ready for remaining phase work in `01-05-PLAN.md`.

## Self-Check: PASSED

- Verified created files exist on disk.
- Verified task commit hashes exist in repository history.

---
*Phase: 01-runtime-guardrails-and-ipc-backbone*
*Completed: 2026-02-16*
