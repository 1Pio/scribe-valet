# Feature Research

**Domain:** Local-first desktop voice dictation + voice assistant
**Researched:** 2026-02-15
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Global push-to-talk hotkey (start/stop capture) | OS dictation and modern dictation apps all expose hotkeys/shortcuts for quick capture | MEDIUM | Must work reliably across apps and keyboard layouts; baseline UX for "press, speak, done" |
| Accurate speech-to-text with punctuation support | Core reason to use the product; users compare against OS dictation quality immediately | HIGH | Needs robust defaults plus optional auto-punctuation and command words |
| Direct insertion into current app (paste or type simulation) | Dictation users expect text to appear where cursor is, not in a separate window | HIGH | Requires focused-field detection, clipboard safety, and fallback behavior |
| Basic editing/voice commands | Windows and macOS dictation expose "delete that", "new line", etc. | MEDIUM | Start with a small command grammar; avoid full desktop voice-control scope in v1 |
| Multi-language input and microphone selection | Native dictation products expose both language switching and mic source controls | MEDIUM | Include per-mode language + device settings and fast switching |
| Privacy controls and local/offline path | "Local-first" buyers actively look for on-device processing and explicit data handling | MEDIUM | Clear toggles: local providers first, cloud optional with explicit user keys |
| Conversation UI basics for assistant mode (history + model selection) | Local assistant apps (GPT4All/LM Studio/Jan) normalize chat history and model switching | MEDIUM | Keep history short-lived by default; expose clear model/runtime state |
| Hardware-aware runtime selection (Auto/CPU/GPU fallback) | Local AI desktop users expect apps to run on non-GPU machines with graceful degradation | HIGH | Device auto-selection + hard fallback prevents "app does nothing" failures |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Two explicit modes: Dictation (fast insert) vs Assistant (turn-based voice chat) | Reduces cognitive load versus one overloaded interface; matches user intent per task | MEDIUM | Strong mode boundaries prevent accidental tool calls during plain dictation |
| Deterministic cleanup pipeline with raw-transcript fallback | Improves trust: users always get usable output even when cleanup/model steps fail | HIGH | Keep raw output + cleaned output + failure reason for debugging and confidence |
| Per-mode Python tool allowlists + visible execution logs | Makes assistant extensibility practical without becoming opaque or risky | HIGH | Competitive edge vs "magic" tools: explainability + safety controls by default |
| Clipboard backup + "never lose dictation" recovery | Solves painful edge case (focus change/paste failure) better than many competitors | MEDIUM | Store last successful artifact + quick restore action |
| Preset-driven onboarding (Light/Balanced/Power + behavior characteristics) | Faster first success on diverse hardware; fewer settings required up front | MEDIUM | Hardware-aware defaults are a strong UX moat for local-first apps |
| Voice-activated capture option (VAD) in addition to push-to-talk | Enables hands-free workflows while keeping manual mode for control-sensitive contexts | MEDIUM | Should be optional and clearly indicated to avoid accidental recordings |
| Transparent provider routing (local by default, BYO keys for cloud) | Converts privacy concern into product trust; aligns with open/local-first audience | MEDIUM | Show where audio/text went on each run (provider, local/cloud, model) |
| IPC-only architecture with no localhost ports for core UX | Security and reliability differentiator for enterprise/security-conscious users | HIGH | Position as "utility app, not local server stack" |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Always-on wake word in v1 | Feels futuristic and hands-free | High false-trigger risk, battery drain, privacy anxiety, much harder QA across noisy setups | Stick to push-to-talk + optional explicit VAD mode |
| Full desktop voice control macro system in v1 | Users ask for "control everything by voice" | Explodes scope into accessibility/automation platform; brittle cross-app behavior | Keep scoped text-edit commands + explicit assistant tool calls |
| Multi-agent autonomous workflows | Sounds powerful for assistant mode | Hard to make predictable; poor trust for desktop utility use cases | Single-agent short turns with transparent tool logs |
| Mandatory cloud account for core dictation | Simplifies telemetry/business model | Violates local-first promise and blocks offline use | Optional login; core dictation/assistant works fully offline |
| Heavy meeting-recorder product pivot | Adjacent demand exists | Pulls roadmap into long-session recording, diarization UX, storage/legal complexity | Keep short-session dictation first; add lightweight meeting digest later if validated |

## Feature Dependencies

```
Global hotkey capture
    └──requires──> Audio device selection + permissions
                       └──requires──> Stable local STT runtime

Stable local STT runtime
    └──requires──> Model lifecycle management (download, verify, storage)

Focused-field insertion (paste/type)
    └──requires──> Clipboard backup + recovery

Assistant voice turns (STT -> LLM -> TTS)
    └──requires──> Conversation state + model routing
                       └──requires──> Hardware-aware device fallback (Auto/CPU/GPU)

Tool-enabled assistant mode
    └──requires──> Per-mode allowlists + execution sandbox
                       └──requires──> Transparent tool logs

Voice-activated capture (VAD)
    ──enhances──> Global hotkey capture

Always-on wake word
    ──conflicts──> Privacy-first + low-complexity v1 goals

Long-form meeting recorder scope
    ──conflicts──> Fast dictation UX and greenfield MVP focus
```

### Dependency Notes

- **Global hotkey capture requires audio permissions and stable STT runtime:** capture UX is only as good as startup latency and permission reliability.
- **Focused-field insertion requires clipboard backup:** insertion can fail on app focus changes; backup prevents data loss.
- **Tool-enabled assistant requires allowlists and logs:** capability without governance reduces user trust and raises security risk.
- **VAD enhances hotkey mode, not replaces it:** manual control remains essential in noisy environments.
- **Wake-word and long-meeting scope conflict with MVP:** both add major complexity before core dictation reliability is proven.

## MVP Definition

### Launch With (v1)

Minimum viable product - what's needed to validate the concept.

- [ ] Push-to-talk dictation with local STT and reliable focused-field insertion - core product promise.
- [ ] Fast cleanup + punctuation + raw transcript fallback - ensures output quality without silent failures.
- [ ] Clipboard backup and recovery action - protects against insertion edge cases.
- [ ] Assistant short-turn mode (local STT + local LLM + local TTS) - validates second core mode.
- [ ] Per-mode tool allowlists + transparent tool logs - enables safe extensibility from day one.
- [ ] Hardware-aware onboarding presets (Light/Balanced/Power) - improves first-run success on varied machines.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Voice-activated mode (VAD) - add when baseline hotkey reliability and false-trigger handling are stable.
- [ ] Multi-language quality presets and quick-switch controls - add after English-first flow is solid.
- [ ] Optional cloud history sync for text artifacts - add only after local history UX is trusted.
- [ ] Meeting digest workflow (short recordings + summary) - add if user demand is real and repeated.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Always-on wake word - defer until privacy posture, battery impact, and false-positive rates are solved.
- [ ] Rich plugin marketplace/community tool hub - defer until tool API and trust model are stable.
- [ ] Full desktop voice control and macro automation - defer unless product intentionally expands beyond dictation/assistant.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Push-to-talk dictation + local STT | HIGH | MEDIUM | P1 |
| Focused-field insertion + clipboard backup | HIGH | HIGH | P1 |
| Cleanup pipeline + raw fallback | HIGH | HIGH | P1 |
| Assistant short turns (STT->LLM->TTS) | HIGH | HIGH | P1 |
| Per-mode tool allowlists + logs | HIGH | HIGH | P1 |
| Hardware-aware onboarding presets | HIGH | MEDIUM | P1 |
| Voice-activated (VAD) mode | MEDIUM | MEDIUM | P2 |
| Multi-language quality presets | MEDIUM | MEDIUM | P2 |
| Optional cloud text sync | MEDIUM | MEDIUM | P2 |
| Meeting digest workflow | MEDIUM | HIGH | P3 |
| Always-on wake word | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A (Superwhisper) | Competitor B (Epicenter Whispering) | Our Approach (Scribe-Valet) |
|---------|------------------------------|--------------------------------------|------------------------------|
| Global shortcut dictation | Strong shortcut-first UX with app-wide insertion | Shortcut-first with manual and voice-activated modes | Match shortcut speed; add stronger failure recovery and deterministic paste fallback |
| Local/offline operation | Markets offline mode and local model support | Local-first with Whisper C++/Speaches options and explicit data model | Local by default; no account required for core features |
| Automatic text insertion | Clipboard integration + auto-paste in active app | Transcribe/copy/paste at cursor workflow | Paste into focused field with clipboard backup + restore |
| AI cleanup/transforms | Custom modes/prompts and formatting | Prompt-based transformation pipeline with provider routing | Fast cleanup pipeline optimized for dictation reliability first |
| Assistant/tooling | Meeting assistant + model/provider variety | Primarily dictation + transformations, not deep assistant tooling | Dedicated assistant mode with per-mode Python tool allowlists + transparent logs |
| Transparency/privacy posture | Strong privacy claims, mostly product-site level detail | Explicit local storage and routing details in README/docs | Explicit per-run routing and tool logs surfaced in product UI |

## Sources

- Microsoft Support: Windows Voice Typing (hotkey, commands, auto punctuation, language support, online SR) - https://support.microsoft.com/en-us/windows/use-voice-typing-to-talk-instead-of-type-on-your-pc-fec94565-c4bd-329d-e59a-af033fa5689f (official, HIGH)
- Apple Support: Dictate messages/documents on Mac (shortcut, punctuation commands, mic/language settings, on-device processing note) - https://support.apple.com/guide/mac-help/use-dictation-mh40584/mac (official, HIGH)
- Superwhisper site (offline mode, clipboard integration, shortcuts, multilingual, meeting assistant, custom modes) - https://superwhisper.com (official product source, MEDIUM)
- Epicenter Whispering README (shortcut dictation, local/cloud providers, VAD mode, transformations, local-first data handling) - https://raw.githubusercontent.com/EpicenterHQ/epicenter/main/apps/whispering/README.md (official repo docs, HIGH)
- whisper.cpp README (real-time mic stream, command/talk-llama examples, VAD support, local/offline assistant feasibility) - https://github.com/ggml-org/whisper.cpp (official repo docs, HIGH)
- GPT4All docs (local desktop assistant norms: model selection, chat history, device settings, private local execution) - https://docs.gpt4all.io/ (official docs, HIGH)
- LM Studio docs (local model runtime, offline operation, MCP servers, local chat/doc workflows) - https://lmstudio.ai/docs/app (official docs, HIGH)
- Jan site (local-first assistant positioning, connectors trend, model choice UX; marketing-level detail) - https://jan.ai (official product source, LOW)

---
*Feature research for: local-first desktop dictation + voice assistant*
*Researched: 2026-02-15*
