---
status: ready_for_retest
phase: 01-runtime-guardrails-and-ipc-backbone
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md]
started: 2026-02-16T10:44:45.304Z
updated: 2026-02-16T11:27:34Z
---

## Current Test

[automation complete - awaiting live window verification]

## Tests

### 1. App shell shows connected runtime bridge
expected: Launch the app with `npm run dev`. The first screen shows `Scribe-Valet` and `Runtime bridge status: connected`.
result: ready_for_human_verify
evidence: `src/main/index.ts` now loads compiled renderer entry via script URL (no inline `require(...)` bootstrap), and `src/renderer/index.tsx` renders `Scribe-Valet` headline plus runtime bridge status text.

### 2. Worker crash auto-recovers without relaunch
expected: If the runtime worker is interrupted, the app transitions to reconnecting and then returns to ready/connected automatically without requiring an app restart.
result: ready_for_human_verify
evidence: Bootstrap instantiates/starts `WorkerSupervisor`, runtime status publication is wired to renderer, and recovery pathways are exposed through `runtime:retry` / status updates (`src/main/index.ts`, `src/main/ipc/runtime-controller.ts`).

### 3. Incompatible handshake is rejected with recovery guidance
expected: When worker protocol/version is incompatible, the app enters mismatch state and shows a clear recovery path (fix-first guidance with optional details) instead of hanging.
result: ready_for_human_verify
evidence: Renderer entry mounts `AppShell` with mismatch panel + runtime banner; mismatch modeling/panel tests pass via `npm run test -- src/renderer/runtime-status/runtime-state-machine.test.ts src/renderer/runtime-status/MismatchRecoveryPanel.test.tsx`.

### 4. Local-only mode badge appears with trust copy
expected: The UI shows a Local-only mode badge with copy indicating internal connections stay on-device and no localhost/internal API ports are used.
result: ready_for_human_verify
evidence: Existing trust UI remains mounted inside AppShell children, preserving `LocalOnlyBadge` and privacy content.

### 5. Privacy runtime checks row exposes details and actions
expected: Settings > Privacy includes a Runtime checks row with status text and actionable controls including Details, Retry, and Copy report.
result: ready_for_human_verify
evidence: `PrivacySettingsPage` remains mounted and still receives `runtimeTrustBridge` from preload.

### 6. Unconfirmed trust does not block local usage
expected: In unconfirmed trust state, local dictation and assistant remain available while trust recovery actions (Retry/Details) are still visible.
result: ready_for_human_verify
evidence: No blocking logic was added to local usage flows; trust controls remain non-blocking in privacy UI.

## Summary

total: 6
passed: 0
issues: 0
ready_for_human_verify: 6
skipped: 0

## Gaps

None in code wiring. Remaining work is live human verification in an interactive Electron window.

## Recheck Commands

```bash
npm run validate:runtime
npm run test -- src/main/ipc/runtime-controller.test.ts src/renderer/runtime-status/runtime-state-machine.test.ts src/renderer/runtime-status/MismatchRecoveryPanel.test.tsx
npm run dev
```
