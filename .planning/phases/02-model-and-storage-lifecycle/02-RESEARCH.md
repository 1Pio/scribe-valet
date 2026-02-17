# Phase 2: Model and Storage Lifecycle - Research

**Researched:** 2026-02-17
**Domain:** Electron local model lifecycle (startup readiness, resumable downloads, integrity verification, storage layout)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
- Full initial onboarding/welcome flow as the primary first-run gate belongs to Phase 7 (onboarding/settings).
- Rich model-group management and broader model re-selection behavior in settings belongs to a later phase.
</user_constraints>

## Summary

This phase should be implemented as a main-process-owned model lifecycle service with strict separation of concerns: readiness evaluation, storage path resolution, download/verification, and UI projection. Existing project architecture already uses main-process controllers + preload bridges + renderer state mapping, so Phase 2 should extend that pattern rather than introducing a parallel flow.

Electron and Node built-ins are sufficient for core behavior: Electron path APIs for OS defaults and overrides, Node `fs/promises` for directory/file lifecycle, Node streams for safe download piping with cancellation, and Node crypto hashing for integrity verification. Resume-on-next-launch should be metadata-driven (persist partial file state and server validators such as ETag/Last-Modified) and must fallback cleanly when range resume is not supported.

For discretion areas, use a 3000 ms banner escalation threshold (consistent with existing delayed threshold), keep default auto-retries at 2, and adapt retries only for transient/network-class failures (never for deterministic checksum mismatch). This keeps UX stable and preserves safety-first recovery behavior.

**Primary recommendation:** Implement a single `ModelLifecycleService` in main process with manifest-driven checks, atomic install writes, resumable range download support, and explicit readiness state emission to renderer.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `electron` | `^40.0.0` (repo) | OS paths, app lifecycle, desktop shell integration | `app.getPath`, `app.setPath`, and `app.setAppLogsPath` provide the correct cross-platform storage defaults/overrides. |
| `node:fs/promises` + `node:fs` | Bundled with Electron runtime | Directory creation, file staging, atomic promote, stream output | `mkdir({ recursive: true })`, `rename`, `statfs`, and `createWriteStream` are stable and cover lifecycle operations. |
| `node:stream/promises` | Bundled with Electron runtime | Backpressure-safe download pipelines + cancellation | `pipeline(..., { signal })` handles stream wiring and abort behavior robustly. |
| `node:crypto` | Bundled with Electron runtime | Integrity verification for model artifacts | `createHash('sha256')` is standard and stream-friendly for large files. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:path` | Bundled | Path normalization/joining across OSes | Always for directory derivation and per-category path mapping. |
| `node:os` | Bundled | Runtime platform checks and temp path use | Use for diagnostics and fallback temp staging policies. |
| `semver` | `^7.7.4` (repo) | Runtime/model compatibility checks | Use if model manifest carries minimum runtime version constraints. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node built-in downloader pipeline | Third-party downloader libs | More features, but adds dependency surface and less alignment with current minimal stack. |
| JSON metadata files | SQLite model registry | Better queryability/recovery semantics, but higher implementation overhead for this phase if requirements remain simple. |

**Installation:**
```bash
npm install
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/model-lifecycle/         # readiness checks, download, verify, install
├── main/storage/                 # path resolution + override policy
├── main/ipc/model-lifecycle-*.ts # IPC controllers/events
├── preload/model-lifecycle-*.ts  # narrow bridge for renderer
├── renderer/model-lifecycle/     # readiness/setup screen + download modal
└── shared/types/model-lifecycle.ts # shared DTOs/state enums
```

### Pattern 1: Main-Process Lifecycle Orchestrator
**What:** Single orchestrator computes startup readiness, executes required downloads/verifications, and emits state deltas.
**When to use:** Always; renderer should not own model file logic.
**Example:**
```typescript
// Source: https://www.electronjs.org/docs/latest/api/app
// Source: https://nodejs.org/api/fs.html#fspromisesmkdirpath-options
const roots = {
  config: app.getPath("userData"),
  logs: app.getPath("logs"),
  models: resolvedModelPath,
  tools: resolvedToolsPath
};

await mkdir(roots.models, { recursive: true });
```

### Pattern 2: Two-Phase Artifact Install (stage -> verify -> promote)
**What:** Download into temp/partial file, hash verify, then promote via rename into active model path.
**When to use:** Every model artifact download/update.
**Example:**
```typescript
// Source: https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options
// Source: https://nodejs.org/api/fs.html#fspromisesrenameoldpath-newpath
const digest = await sha256File(stagedPath);
if (digest !== expectedSha256) throw new Error("checksum-mismatch");
await rename(stagedPath, finalPath);
```

### Pattern 3: Resume-Aware HTTP Fetch
**What:** Persist partial byte count + validator (`ETag` or `Last-Modified`) and resume with `Range` + `If-Range`.
**When to use:** Any interrupted model download.
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests
// Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Range
const headers: Record<string, string> = { Range: `bytes=${downloadedBytes}-` };
if (ifRangeValidator) headers["If-Range"] = ifRangeValidator;
```

### Anti-Patterns to Avoid
- **Renderer-owned file operations:** breaks trust boundaries and complicates error handling; keep model lifecycle in main process.
- **Direct write to final model file during download:** risks corrupted active artifacts; always stage then promote.
- **Blind resume without validator:** can append bytes from changed upstream file; always pair resume with `If-Range` validator.
- **Dumping models into `userData`:** Electron warns `userData` should not store large files; keep models in dedicated model root.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hash algorithm | Custom checksum code | `crypto.createHash('sha256')` | Standardized correctness and streaming support for large artifacts. |
| Stream flow control | Manual chunk/event plumbing | `stream/promises.pipeline` | Handles backpressure, completion, and abort semantics correctly. |
| OS path defaults | Homegrown per-OS path tables | `app.getPath(...)` + `app.setPath(...)` | Official Electron behavior avoids cross-platform path bugs. |
| Recursive directory setup | Manual parent-walk create loop | `fsPromises.mkdir({ recursive: true })` | Built-in, race-safe enough for app startup path provisioning. |

**Key insight:** Most failures in model lifecycle are not algorithmic; they are edge-case handling failures around partial files, path resolution, and interrupted I/O. Built-ins already solve the hard mechanics.

## Common Pitfalls

### Pitfall 1: Resume appends to changed remote artifact
**What goes wrong:** Partial file resumes, checksum fails repeatedly, user sees non-deterministic verification errors.
**Why it happens:** Resume uses `Range` but no `If-Range` validator.
**How to avoid:** Persist `ETag`/`Last-Modified`; use `If-Range`; if server returns `200`, discard partial and restart full download.
**Warning signs:** Multiple fast checksum failures after resume; server response status flips between `206` and `200`.

### Pitfall 2: Missing directory creation before path override
**What goes wrong:** `app.setPath` throws and startup readiness gets stuck in error loop.
**Why it happens:** Electron requires the override directory to exist first.
**How to avoid:** Pre-create candidate path via `mkdir(..., { recursive: true })` before applying override.
**Warning signs:** Immediate startup error right after user saves a new custom path.

### Pitfall 3: Incomplete atomicity during install
**What goes wrong:** Process crash leaves half-written model in active slot.
**Why it happens:** Download writes directly to final file.
**How to avoid:** Use `.partial` staging + hash verify + `rename` promote.
**Warning signs:** File exists with expected name but mismatched size/hash after crash.

### Pitfall 4: UI mode gating drifts from actual model health
**What goes wrong:** Assistant mode appears available when required model failed verification.
**Why it happens:** Capability gating tied to stale cached state, not latest readiness report.
**How to avoid:** Emit readiness snapshot from main process as source of truth and derive mode availability from that snapshot only.
**Warning signs:** UI badges and runtime behavior disagree after retries.

### Pitfall 5: No disk capacity preflight
**What goes wrong:** Download fails near completion with ENOSPC.
**Why it happens:** Required bytes are not compared against available space.
**How to avoid:** Use `fsPromises.statfs` preflight before starting large artifacts.
**Warning signs:** Repeated ENOSPC despite successful network transfer starts.

## Code Examples

Verified patterns from official sources:

### Storage roots + override safety
```typescript
// Source: https://www.electronjs.org/docs/latest/api/app
// setPath target must exist first; create it before override.
await mkdir(customModelDir, { recursive: true });
app.setPath("sessionData", customSessionDataDir);
```

### Abortable download pipeline
```typescript
// Source: https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-options
const controller = new AbortController();
await pipeline(responseBodyStream, createWriteStream(partialPath), {
  signal: controller.signal
});
```

### Streamed SHA-256 verification
```typescript
// Source: https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options
const hash = createHash("sha256");
for await (const chunk of createReadStream(filePath)) {
  hash.update(chunk);
}
const digest = hash.digest("hex");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Download whole file; restart from zero | Byte-range resume with validator (`Range` + `If-Range`) | Standardized in HTTP semantics; current MDN guidance (2025) | Faster recovery after interruption and lower bandwidth waste. |
| Store all app data under single app dir | Separate large artifacts from config/session/log paths | Explicit in Electron `getPath` docs | Cleaner backups, less cache/config pollution, easier support diagnostics. |
| Hash after loading full file in memory | Streamed hashing during file read | Established Node crypto practice | Handles multi-GB artifacts safely with bounded memory. |

**Deprecated/outdated:**
- Treating weak ETags as strong integrity validators for resume safety; use strong validators for range-safe resume logic.

## Open Questions

1. **Model manifest authority and trust chain**
   - What we know: MODL requirements require integrity verification before use.
   - What's unclear: Whether checksum manifest is bundled, remote-fetched, signed, or both.
   - Recommendation: Plan tasks to support bundled manifest first; add manifest signature verification extension point.

2. **Exact policy for adaptive retry count**
   - What we know: Default is two retries, with adaptive flexibility.
   - What's unclear: Precise mapping from error class to retry expansion.
   - Recommendation: Adopt deterministic policy now: checksum mismatch = no expansion; network timeout/reset = up to 4 attempts with capped backoff.

## Sources

### Primary (HIGH confidence)
- Electron app API: https://www.electronjs.org/docs/latest/api/app (checked `getPath`, `setPath`, `setAppLogsPath`, `sessionData` behavior)
- Node fs API: https://nodejs.org/api/fs.html (checked `fsPromises.mkdir`, `fsPromises.rename`, `fsPromises.statfs`, `fs.createWriteStream`)
- Node stream API: https://nodejs.org/api/stream.html (checked `stream/promises.pipeline` and abort semantics)
- Node crypto API: https://nodejs.org/api/crypto.html (checked `crypto.createHash` streaming usage)

### Secondary (MEDIUM confidence)
- MDN Range requests: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests (resume flow, `206/200/416` behavior)
- MDN If-Range: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Range (conditional resume semantics)
- MDN ETag: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag (strong vs weak validator implications)

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - based on current repo dependencies + official Electron/Node APIs.
- Architecture: HIGH - aligns with existing phase-1 controller/bridge/state-machine patterns already in repo.
- Pitfalls: HIGH - grounded in official API constraints and HTTP range semantics.

**Research date:** 2026-02-17
**Valid until:** 2026-03-19
