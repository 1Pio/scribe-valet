# Phase 2: Model and Storage Lifecycle - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a predictable local model lifecycle where startup clearly reflects model readiness, missing artifacts are downloaded and integrity-verified automatically, and models/config/tools/logs are stored in clearly separated locations with OS defaults plus user override support.

</domain>

<decisions>
## Implementation Decisions

### Startup readiness display
- Use a mixed startup readiness approach: auto-check silently for minor issues and only surface a banner if resolution takes more than a few seconds.
- Show a dedicated readiness/setup screen before normal app use for non-trivial problems (for example: true model absence, path mismatch, missing model directory, or no usable model/path settings).
- Apply mode-specific availability: if LLM/TTS is unavailable, block Assistant mode; if STT is healthy, keep Dictation available with explicit notice that output is raw (no AI enrichment).
- When startup is healthy, show a brief confirmation toast that fades; include an action to copy the full readiness report.
- Keep a code-level boolean toggle available so the ready toast can be globally disabled in production builds.
- While checks are running, show compact spinner + status text; provide an expand action that reveals a compact, descriptive step-by-step checklist.

### Download flow behavior
- Prompt once (single modal) before download begins to confirm download location and models as a bundle, rather than prompting per model.
- Use user-friendly model names in the modal heading and compact per-model progress lines with explicit percent text (0-100%).
- Default to no active download controls in the modal (observe-only during normal flow).
- Resume interrupted downloads automatically on next launch.

### Verification failure recovery
- Lead with a compact safety-first message when integrity verification fails, then immediately present direct recovery actions.
- Default to two automatic retries before requiring user action, with flexibility to adapt retry count based on failure speed/signals.
- Recovery UI actions after failed auto-retries: `Retry`, `Change path directory` (inline editable input prefilled with current path), and `Show/Copy diagnostics report`.
- Use mode-specific degradation if only one model type fails verification, so unaffected capabilities remain usable.

### Storage locations UX
- Allow storage path configuration in both startup/readiness flow and settings.
- In normal UI, default to showing only the active path (not all category paths simultaneously).
- When user enters a missing directory, offer/create it during path change flow.
- Use a hybrid override model: one shared custom root by default with optional per-category overrides.

### Claude's Discretion
- Exact threshold value for when silent startup checks escalate to visible banner.
- Exact wording/style variants for compact status and safety messages.
- Exact adaptation policy for dynamic retry-count adjustments.

</decisions>

<specifics>
## Specific Ideas

- Download modal example direction: heading like "Downloading AI models" with per-model lines such as "[model] - 14%".
- Running-check UI should feel positive and compact first, with an optional expandable details view mainly for debugging/power users.

</specifics>

<deferred>
## Deferred Ideas

- Full initial onboarding/welcome flow as the primary first-run gate belongs to Phase 7 (onboarding/settings).
- Rich model-group management and broader model re-selection behavior in settings belongs to a later phase.

</deferred>

---

*Phase: 02-model-and-storage-lifecycle*
*Context gathered: 2026-02-17*
