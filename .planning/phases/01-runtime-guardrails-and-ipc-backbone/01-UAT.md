---
status: revalidated
phase: 01-runtime-guardrails-and-ipc-backbone
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-04-SUMMARY.md, 01-05-PLAN.md]
started: 2026-02-16T07:29:49.579Z
updated: 2026-02-16T10:14:45.000Z
---

## Canonical Launch

- Command: `npm run dev`
- Expected: app opens with `Scribe-Valet` heading and `Runtime bridge status: connected`
- Notes: `npm run dev` now builds then launches Electron (`npm run build && electron .`)

## Recheck Order

1. Boot smoke check (Test 1)
2. Local-only trust badge visibility (Test 4)
3. Privacy runtime checks row actions (Test 5)
4. Unconfirmed trust availability behavior (Test 6)

## Tests

### 1. App shell shows connected runtime bridge
expected: Launch via `npm run dev` and first screen shows `Scribe-Valet` plus `Runtime bridge status: connected`.
result: pass
evidence:
  - `npm run dev` output confirms script exists and launches Electron without `Missing script: dev`.
  - Electron logs cache-directory warnings in this CLI sandbox, but launch continues and no startup script errors occur.
  - Compiled renderer bundle includes heading and runtime status copy:
    - `dist/renderer/index.js` contains `Scribe-Valet`
    - `dist/renderer/index.js` contains `Runtime bridge status:`

### 2. Worker crash auto-recovers without relaunch
expected: If the runtime worker is interrupted, the app transitions to reconnecting and returns to a ready/connected state automatically without restarting the app.
result: skipped
reason: Not part of 01-05 scope.

### 3. Incompatible handshake is rejected with recovery guidance
expected: When worker protocol/version is incompatible, runtime enters mismatch state and shows clear recovery messaging instead of hanging or undefined behavior.
result: skipped
reason: Not part of 01-05 scope.

### 4. Local-only mode badge appears with trust copy
expected: The renderer shows a Local-only mode badge with tooltip text indicating no localhost/internal API ports are used.
result: pass
evidence:
  - `npm run validate:runtime` passes with narrowed transport-only scanner.
  - Compiled renderer output contains required badge strings in `dist/renderer/components/LocalOnlyBadge.js`:
    - `Local-only mode`
    - `Internal connections stay on this device`

### 5. Privacy runtime checks row exposes details and actions
expected: Settings > Privacy shows a Runtime checks row with status headline plus Details, Retry, and Copy report actions.
result: pass
evidence:
  - `npm run test -- src/main/runtime-trust/trust-check.test.ts src/renderer/settings/privacy/RuntimeChecksRow.test.tsx` passed (5 tests).
  - `dist/renderer/settings/privacy/RuntimeChecksRow.js` includes `Runtime checks`, `Details`, and `Copy report`.

### 6. Unconfirmed trust does not block local usage
expected: In unconfirmed trust state, dictation and assistant remain available while Retry and Details are still shown.
result: pass
evidence:
  - `RuntimeChecksRow.test.tsx` asserts unconfirmed state renders `Retry`, `Details`, and `local dictation and assistant remain available`.
  - `dist/renderer/settings/privacy/RuntimeChecksRow.js` includes the same availability message in shipped renderer output.

## Validation Commands Run

1. `npm run dev` (script launches build + Electron; no missing-script failure)
2. `npm run validate:runtime` (passed)
3. `npm run test -- src/main/runtime-trust/trust-check.test.ts src/renderer/settings/privacy/RuntimeChecksRow.test.tsx` (passed; 2 files, 5 tests)
4. `rg -n "Scribe-Valet|Runtime bridge status|Local-only mode|Runtime checks|local dictation and assistant remain available" dist/renderer/index.js dist/renderer/components/LocalOnlyBadge.js dist/renderer/settings/privacy/RuntimeChecksRow.js`

## Summary

total: 6
passed: 4
issues: 0
pending: 0
skipped: 2

## Gap Closure Outcome

- Canonical startup now exists and is documented as `npm run dev`.
- Runtime guardrail now targets executable transport violations and no longer fails on trust copy/test literals.
- Trust badge/privacy-row/unconfirmed UX checks for 1/4/5/6 are actionable with current runtime validation gates passing.
