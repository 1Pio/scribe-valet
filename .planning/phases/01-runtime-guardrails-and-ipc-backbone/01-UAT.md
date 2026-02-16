---
status: diagnosed
phase: 01-runtime-guardrails-and-ipc-backbone
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md]
started: 2026-02-16T10:44:45.304Z
updated: 2026-02-16T12:04:00Z
---

## Current Test

[testing complete]

## Tests

### 1. App shell shows connected runtime bridge
expected: Launch the app with `npm run dev`. The first screen shows `Scribe-Valet` and `Runtime bridge status: connected`.
result: pass

### 2. Worker crash auto-recovers without relaunch
expected: If the runtime worker is interrupted, the app transitions to reconnecting and then returns to ready/connected automatically without requiring an app restart.
result: pass

### 3. Incompatible handshake is rejected with recovery guidance
expected: When worker protocol/version is incompatible, the app enters mismatch state and shows a clear recovery path (fix-first guidance with optional details) instead of hanging.
result: issue
reported: "pass ; Note: it does work as expected, banner gets shown of there is any mismatch and buttons generally work as expected; only that trying again or restarting of cause does not solve the simulated issue automatically, but the app refrashes etc. just never truly *restarts* when hitting 'restart app' -> everything more or less as expected"
severity: major

### 4. Local-only mode badge appears with trust copy
expected: The UI shows a Local-only mode badge with copy indicating internal connections stay on-device and no localhost/internal API ports are used.
result: pass

### 5. Privacy runtime checks row exposes details and actions
expected: Settings > Privacy includes a Runtime checks row with status text and actionable controls including Details, Retry, and Copy report.
result: pass

### 6. Unconfirmed trust does not block local usage
expected: In unconfirmed trust state, local dictation and assistant remain available while trust recovery actions (Retry/Details) are still visible.
result: skipped
reason: "User could not reliably place app in unconfirmed trust state to verify behavior in this run."

## Summary

total: 6
passed: 4
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "When worker protocol/version is incompatible, the app enters mismatch state and shows a clear recovery path (fix-first guidance with optional details) instead of hanging."
  status: failed
  reason: "User reported: pass ; Note: it does work as expected, banner gets shown of there is any mismatch and buttons generally work as expected; only that trying again or restarting of cause does not solve the simulated issue automatically, but the app refrashes etc. just never truly *restarts* when hitting 'restart app' -> everything more or less as expected"
  severity: major
  test: 3
  root_cause: "Restart app action maps to worker supervisor reset instead of a true Electron relaunch, so it refreshes runtime state without restarting the app process."
  artifacts:
    - path: "src/main/index.ts"
      issue: "restartApp is wired to restartSupervisor(supervisor), which only stop/starts worker supervisor"
    - path: "src/preload/runtime-status-bridge.ts"
      issue: "runtime:restart-app contract expects RuntimeStatus response, matching refresh semantics rather than relaunch"
    - path: "src/renderer/app/AppShell.tsx"
      issue: "Restart app button correctly calls runtimeStatusBridge.restartApp(), confirming issue is downstream in main behavior"
  missing:
    - "Add dedicated app relaunch handler for restart-app using app.relaunch() and controlled exit"
    - "Keep retry/fix-now mapped to supervisor restart while separating restart-app semantics"
    - "Update restart-app IPC contract/tests to validate relaunch intent"
  debug_session: ".planning/debug/restart-app-action-not-restarting.md"

## Recheck Commands

```bash
npm run validate:runtime
npm run test -- src/main/ipc/runtime-controller.test.ts src/renderer/runtime-status/runtime-state-machine.test.ts src/renderer/runtime-status/MismatchRecoveryPanel.test.tsx
npm run dev
```
