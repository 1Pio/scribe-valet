---
status: diagnosed
trigger: "UAT Test 3 major gap: Restart app action in mismatch recovery UI does not truly restart the application."
created: 2026-02-16
updated: 2026-02-16
---

## Symptoms

- UAT Test 3 reports mismatch UI appears, but clicking `Restart app` only refreshes UI and does not truly restart the app process.
- User report in `.planning/phases/01-runtime-guardrails-and-ipc-backbone/01-UAT.md` states restart/try-again does not resolve the simulated mismatch automatically.

## Investigation Steps

1. Reviewed UAT gap statement and user report in `.planning/phases/01-runtime-guardrails-and-ipc-backbone/01-UAT.md`.
2. Traced renderer click path from mismatch/recovery UI into preload and IPC channels.
3. Traced main-process `runtime:restart-app` handler implementation and compared it with expected app-restart semantics.
4. Checked for any use of Electron relaunch APIs (`app.relaunch`) and found none in runtime recovery flow.

## Findings

- Renderer wiring calls `runtimeStatusBridge.restartApp()` when the `Restart app` button is clicked (`src/renderer/app/AppShell.tsx`).
- Preload bridge maps `restartApp()` to IPC channel `runtime:restart-app` and expects a `RuntimeStatus` response, not app termination/relaunch (`src/preload/runtime-status-bridge.ts`).
- Main process wires all three recovery actions (`fixNow`, `retry`, `restartApp`) to the same function `restartSupervisor(supervisor)` (`src/main/index.ts`), which only stops/starts the worker supervisor and returns status.
- `restartSupervisor` implementation does not relaunch Electron or recreate process-level app state; it only calls `supervisor.stop(); supervisor.start();` (`src/main/index.ts`).
- No `app.relaunch()` path exists in the codebase for this action; only normal `app.quit()` on window close is present.
- Project state notes explicitly record this behavior as intentional wiring: restart-app bound to supervisor reset behavior (`.planning/STATE.md`).

## Root Cause

The `Restart app` UI action is implemented as a worker-supervisor reset (same as Fix now/Try again) rather than a real Electron app relaunch, so clicking it never performs a true application restart.
