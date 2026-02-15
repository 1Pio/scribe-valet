# Phase 1: Runtime Guardrails and IPC Backbone - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver IPC-only runtime behavior (no localhost HTTP/internal API ports), automatic worker lifecycle recovery, and clear user recovery paths for worker handshake/version incompatibilities.

</domain>

<decisions>
## Implementation Decisions

### Recovery experience
- Default to quiet automatic restart/reconnect.
- If the user is actively using voice when disruption happens, show a non-blocking banner like "Reconnecting...".
- On successful quick recovery, remove banner with no success message (optional tiny toast such as "Back on.").
- Retry automatically 3 times with short backoff (about 0.2s -> 0.8s -> 2s), then present next-step guidance.
- If recovery cannot restore service, emphasize `Restart app` and provide `Show details`.

### Mismatch guidance
- Keep default copy human and non-technical (example: "Finishing an update..." / "Fixing a small setup mismatch...").
- Primary path is automatic in-place refresh/update of background component, then automatic reconnect.
- If primary path fails, show `Restart app` fallback.
- Show one-sentence summary by default, with `Details` expander for expected vs installed versions.
- Include `Copy report` in details.
- Use one recommended path first; reveal fallback only when relevant.

### Runtime trust signals
- Show a small `Local-only mode` badge with tooltip: "Internal connections stay on this device".
- In `Settings > Privacy`, include `Runtime checks` row: "No local ports detected" with `Details` and `Copy report`.
- Keep trust messaging out of main flow by default; surface at startup/runtime only if relevant.
- If trust status cannot be confirmed, warn but continue core local use with `Retry` + `Details`.
- Disable only sensitive extras (future network-linked features) when trust check is unconfirmed; keep local dictation/assistant available.
- Use human-first headline ("Runs locally on your device") with technical detail behind expander.

### Status messaging tone
- Avoid internal/system terms in primary copy (`recovering`, `engine`, `daemon`, `service`, `worker`).
- Default transient messages to short human phrasing (2-5 words): "Getting voice ready...", "Starting voice...", "Refreshing in the background...", "Reconnecting...".
- If delayed, use one gentle update around ~3s ("Still starting, almost there..." / "Taking longer than usual...").
- If not recovered by ~8-10s, show first actionable UI with `Try again` + `Restart app`; keep technical details hidden by default.
- Use human verb CTAs as defaults: `Fix now`, `Try again`, `Restart app`, `Copy report`.

### Claude's Discretion
- Exact banner/toast component styling and placement.
- Exact wording variants among approved tone examples.
- Exact thresholds for delayed-state transitions (within discussed intent).

</decisions>

<specifics>
## Specific Ideas

- Preferred phrase direction: calm, normal language instead of infrastructure jargon.
- Example fail-state copy: "Couldn't start voice. Try again or restart the app."
- For trust details: include IPC mention only in expanded technical section.

</specifics>

<deferred>
## Deferred Ideas

- Add a `Report issue` action that auto-collects diagnostics and submits to the project's GitHub owner with optional user note.

</deferred>

---

*Phase: 01-runtime-guardrails-and-ipc-backbone*
*Context gathered: 2026-02-15*
