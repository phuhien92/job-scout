# Job Scout roadmap

Updated: October 20, 2026

## Product direction

Job Scout is an open-source, local-first job application assistant. Technical users can run it on their own computer. A later paid hosted service offers the same core experience without local setup. The browser extension is the main application surface: it reads the current employer form, asks Job Scout for a fill plan, applies supported values, and leaves the completed form for user review and submission.

The Jobright resume screenshot is a product reference for section-level resume feedback. Job Scout should show specific suggestions with evidence from the uploaded resume, let users accept or reject each suggestion, and never invent experience or metrics.

## Experience design source

Design the user journey in **pen.dev** before implementing new application and extension UI. The editable [workflow canvas](design/job-scout.pen) and [overview preview](design/workflow-overview.png) show the first end-to-end proposal; [design notes](design/README.md) map its screens to issues. A [profile reference screen](design/profile-overview.png) and [edit state](design/profile-edit.png) show how verified personal information is maintained for autofill. The design covers desktop and narrow website layouts plus the extension popup/side panel. It shows resume upload, extracted facts and corrections, section-level suggestions and accept/reject, a job-detail handoff, local companion pairing, form detection, proposed answers with evidence, fill preview, unresolved or sensitive questions, and the final user-controlled submit step. Include disconnected companion, unavailable AI, and unsupported form branches. Hosted sign-in remains a future mode placeholder. Treat the design as a reviewable flow proposal; implementation can evolve its components while preserving accepted decisions.

Component implementation follows the [source-backed component research](docs/research/component-architecture.md): local shadcn + Base UI, Job Scout semantic tokens, separate surface shells, and shared primitives extracted when the extension starts. Issue #17 tracks migration of existing controls.

## Shared product architecture

```
Resume and job posting
        │
        ▼
Job Scout core: structured profile, evidence, resume suggestions,
application answer planner, skill runner, ATS adapters, audit trail
        │
        ├── Local mode: website + companion on the user's computer
        │                extension ↔ loopback companion
        │
        └── Hosted mode: website + managed API and storage
                         extension ↔ authenticated hosted API
```

One versioned application-plan contract serves both modes. A transport adapter changes where the extension sends requests; ATS detection, field mapping, validation, and review behavior remain shared. Do not put model credentials or resume storage in the extension.

The extension should use Manifest V3. A content script inspects and fills the active application page; the service worker coordinates requests to the selected backend. Chrome documents that cross-origin fetches belong in extension contexts with host permissions, while content-script fetches follow the page's origin rules. Use `activeTab` and `scripting` to scope page access to user-invoked applications where feasible. Sources: [Chrome network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging).

### Application-plan contract

[Contract v1 and privacy boundaries](docs/application-plan.md) are implemented in `src/lib/application-plan/contract.ts`, with a synthetic Rippling fixture and offline tests. This is the schema/validation foundation for #19; transport, pairing, live ATS scanning, and filling remain later work.

The extension sends a job URL, ATS identifier when known, and a bounded list of visible fields: stable field reference, label, type, required flag, options, and nearby explanatory text. The backend returns candidate values with evidence references and confidence, plus unanswered fields and warnings. The extension validates that fields still match before applying values. Unknown or sensitive answers require user review. The backend should not return arbitrary JavaScript or DOM selectors from an AI response.

### Local mode

A local companion owns resume files, structured profile, skill directories, AI credentials, and the application planner. It binds only to loopback and exposes a small authenticated API to the extension. Pair the extension with the companion using a generated secret; keep it in extension-local storage and the companion, never in a content script or webpage. Validate request origin, tab context, payload size, and schema. The local website can run from the same process initially.

Chrome Native Messaging is a later transport option when packaging the companion as a desktop installer; it requires a registered native host and communication via the extension service worker. Source: [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging).

### Hosted mode

The extension signs into the user's Job Scout account and calls the hosted API over HTTPS. The hosted service owns tenant-isolated resume storage, AI requests, skills allowed by the service, billing, and application history. This mode does not require a local companion. Use the same application-plan schema and extension UI as local mode. Account authentication and rate limits belong to the hosted API, not to the employer page.

### AI providers

Local mode offers two explicit paths:

1. **Sign in with ChatGPT plan usage** for eligible open-source, locally run installations, subject to user consent, account eligibility, and current feature limits. Use the supported local SDK or an app-server integration, not terminal UI automation. This does not reveal the user's ChatGPT conversations or API key to Job Scout. Sources: [OpenAI quickstart](https://developers.openai.com/siwc/quickstart), [local app integration](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt), [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).
2. **User-supplied API key** as a provider-neutral fallback. Store it in the local companion's protected credential store; never bundle it into the extension or frontend.

The paid hosted mode should budget for its own usage-based AI provider account or an explicitly supported user-key option. OpenAI currently limits ChatGPT-plan usage for paid or remotely hosted apps to approved access; do not assume local open-source eligibility carries over to the SaaS offering. Source: [OpenAI plan-usage overview](https://developers.openai.com/siwc/token-sharing-open-source).

Use a narrow AI-provider interface in the core. The current Mastra agent's `MODEL` plus provider-key configuration can be the first API-key implementation. Direct model requests suffice for bounded critique and answer drafting. Consider Codex app-server when a skill needs a longer tool-using workflow and approval events. Sources: [Codex app-server plan integration](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server), [Codex as a platform](https://developers.openai.com/blog/codex-as-a-platform).

### Extensibility

Keep the core closed to ad-hoc modification through stable interfaces:

- **ATS adapters:** detect a supported applicant tracking system, normalize its fields, and apply verified fill actions. Start with one adapter and a conservative generic fallback.
- **AI skills:** accept user-selected `SKILL.md` directories in local mode. Skills may shape critique, tailoring, and answer drafting through declared inputs, outputs, and capabilities. The core retains authority over credentials, resume evidence, form writes, and submission. The hosted mode initially offers vetted skills; arbitrary user code needs a separate isolation design.
- **Provider adapters:** choose ChatGPT plan sign-in or an API-key provider without changing the extension protocol.

## Phases and acceptance gates

| Phase | Deliverable | Exit criterion |
| --- | --- | --- |
| 0. Product and flow contract | Update README, AGENTS/CLAUDE guidance, issue backlog, privacy model, application-plan schema, and pen.dev journey | Existing job search/Optimize work is retained; the new application workflow and its review states are explicit |
| 1. Application profile | Persist original resume file and structured contact, work, education, skills, links, work authorization, and user-verified facts with provenance | Upload, edit, and reload a profile without losing source evidence |
| 2. Resume review | Section-level critique and suggestions with accept/reject, role targeting, and export | Every changed claim traces to resume text or a user-entered fact |
| 3. Local extension pilot | MV3 extension, companion pairing, one tested Rippling adapter, fill plan, and review UI | The open Azira-style Rippling application is populated where supported; unanswered fields are clearly marked; no automatic submission |
| 4. AI access and skills | Local ChatGPT plan sign-in where eligible, API-key fallback, user-selected skills, provider and skill contracts | Each mode can complete a bounded analysis request; missing permission or quota produces a recoverable UI state |
| 5. ATS expansion | Test-backed adapters for common forms, attachment handling, application history | Each supported ATS has a representative end-to-end fixture and a manual review checkpoint |
| 6. Hosted service | Accounts, tenant isolation, hosted storage, AI cost controls, billing, extension mode switch | A user can sign in and apply from the same extension without running local software |

## Current code to reuse or evolve

- `src/app/api/profile/upload/route.ts` already accepts PDF, DOCX, and TXT and extracts resume text. Preserve the original file for later attachments.
- `src/lib/working-memory/types.ts` currently stores a small profile and one resume. Introduce a structured application profile with provenance and verification status.
- `src/lib/working-memory/store.ts` preserves the shared read/write boundary; `database.ts` stores local profile/resume evidence in SQLite and imports legacy JSON transactionally. See `docs/application-profile.md` for portable backup and migration. Original resume files remain #43.
- `src/lib/resume/fact-gate.ts` checks numeric claims only. Expand evidence checks for employers, dates, tools, and qualifications without treating the gate as proof of truth.
- `src/mastra/agents/job-scout.ts` currently configures one model from an environment variable. Move provider selection behind the AI-provider interface.

## Issue map

- Completed foundations: #1–#4. The shipped shell and Scout cards closed #1 and #3 during this roadmap review; #2 and #4 were already closed.
- Website and resume flow: #5–#8. Keep the search-to-application handoff and evidence-backed resume suggestions; build from the pen.dev flow.
- Quality and optional provider work: #12, #13. Keep test coverage and Ollama compatible with the shared provider contract.
- Design migration: #17. Use the pen.dev flow to guide new UI; migrate existing `@robr0/design-system` usage to shadcn + Base UI deliberately.
- Design and shared contract: #18–#19. The pen.dev artifact and application-plan schema guide new surfaces.
- Verified profile and local provider: #20–#21. These are the source of form values and AI suggestions.
- Local extension and review: #22–#24. Pair, preview/fill Rippling, then draft screening answers.
- Optional local AI and skills: #25–#26. Eligible ChatGPT plan usage and user-selected skills sit behind the provider/skill contracts.
- Expansion and hosted service: #27–#30. Add another ATS, application history, hosted access, then paid usage controls.

## Deliberate first-release boundaries

The extension fills fields and prepares answers; the user reviews and submits. Do not auto-answer work authorization, sponsorship, equal-opportunity, or other personal declarations without a verified user value. Do not claim universal ATS support. Begin with text fields and known controls; keep resume file upload manual until an adapter has proven it on the target ATS. Keep each application attempt inspectable with its source facts, generated suggestions, applied fields, and unresolved questions.
