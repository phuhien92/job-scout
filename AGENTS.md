# Job Scout

Personal AI job-search product. The current direction is an open-source local app with a browser autofill extension and a later paid hosted service. Read `ROADMAP.md` before planning new product work.

GitHub issues specify implementation slices. Pick the next unblocked `ready-for-agent` issue unless the user requests a particular roadmap phase. Design new application and extension flows in pen.dev first; keep the editable `.pen` artifact and review states linked from implementation issues.

`CLAUDE.md` imports this file; keep that import as the single source of agent guidance.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## What we are building

A local-first assistant that reads a resume, asks what the person is aiming at, suggests evidence-backed improvements, searches live jobs, and helps fill applications through a browser extension. The user reviews and submits. `ROADMAP.md` defines the shared core and later hosted mode.

Surfaces:

- **Scout (`/`)** — Glassdoor-style chat: greeting, job cards, composer
- **Optimize (`/optimize`)** — LinkedIn-style optimizer: critique, in-thread targeting questions, resume artifact, then a jobs handoff
- **Jobs (`/jobs`)** — split view: list, description, match panel
- **Profile (`/profile`)** — slim extracted facts, not a resume CMS

Optimizer and Scout share one working-memory profile. The target role chosen in Optimize is what `/jobs` ranks. **Browse {target role} roles →** is an in-app link to `/jobs`, already scoped. It does not open Handshake.

## Pickup

```bash
gh issue list --label ready-for-agent --state open
gh issue view <n>
```

Start with issues whose Blocked by is none or already closed.

## Stack

- Next.js App Router, React 19, Vercel-ready
- Mastra agent, tools, LibSQL memory
- Legacy UI still imports `@robr0/design-system`; do not add new imports or components from it. Issue #17 removes it after replacement. Use the local `src/components/ui` Base UI-backed primitives for new work and follow `docs/research/component-architecture.md` for the proposed boundaries.
- AI SDK UI (`@mastra/ai-sdk` + `useChat`) with product-owned chat components
- Zod on every tool
- Findwork for listings (typed adapter). Match scores are ours. Do not wrap FoundRole as the product backend.
- Chat streaming: `POST /api/chat` calls Mastra `handleChatStream` (AI SDK v7) for the `jobScout` agent. `onError` only covers stream-time errors; wrap the call and emit a `{ type: "error", errorText }` UI-message part on creation-time throws.

Env (when the app exists): `MODEL` plus the matching provider key, `FINDWORK_API_KEY`.

## Internationalization

next-intl without i18n routing — URLs stay locale-free. English is the default locale; Vietnamese is second.

- `messages/{en,vi}.json`: flat key-value strings, no nested namespaces. Add every new user-facing key to both files.
- `src/i18n/config.ts`: `LOCALE_COOKIE` (`"locale"`), `LOCALES`, `isLocale`. The server resolves the locale from that cookie in `src/i18n/request.ts`.
- `src/lib/locale.tsx`: `LocaleProvider`/`useLocale`. `setLocale` writes the cookie then calls `router.refresh()` so Server Components re-render in the new locale. The EN/VI switcher is a `SegmentedControl` in the shell's shared footer slot (`src/components/AppShell.tsx`), rendered in the sidebar footer on desktop and the mobile drawer footer.
- Client components use `useTranslations()`; Server Components, pages and metadata use the awaitable `getTranslations()` from `next-intl/server`. Both read the same flat keys with no namespace.

## Component architecture

The existing website has local Base UI-backed primitives in `src/components/ui`, product components in `src/components`, and a legacy `@robr0/design-system` dependency. No new UI should depend on the legacy package. Before writing UI, load the `job-scout-ui` skill: its component catalog is generated from `src/components/ui` (`pnpm ui:catalog`, checked in CI), and ESLint blocks legacy imports and raw form controls in product code. The migration plan and source-backed component boundaries are in `docs/research/component-architecture.md`; issue #17 tracks implementation and final dependency removal.

The shared shell lives in `src/components/AppShell.tsx` and wraps the Scout, Optimize, Jobs, and Profile routes through `src/app/layout.tsx`. Preserve desktop and narrow navigation, keyboard operation, focus behavior, theme switching, and EN/VI controls while replacing legacy components. Verify at 375px and 1440px.

Theme switching currently uses `data-theme` on `<html>` and `src/lib/theme.tsx`. New tokens must be owned by Job Scout; do not add styles that depend on `@robr0` token CSS. Copy uses sentence-case labels, no emoji, and no em dashes in product UI.

## Shared application contract

`src/lib/application-plan/contract.ts` defines the versioned extension/backend boundary. Read `docs/application-plan.md` before changing scanners, planners, or fill adapters. Keep it independent of React, Next.js, Chrome APIs, and provider code; validate wire payloads and recheck the active scan before user-approved writes.

## Agent rules

- Tools are the only things that touch the world. Never invent jobs, URLs, employers, or resume metrics. Rewrites are evidence-only (optional fact-gate against source text); adaptive framing only.
- Match scores are explainable and multi-factor (2–3 dimensions + Strong Fit / Stretch / Long-shot bands). Hard blockers (remote/geo etc.) stay separate from the fit band. Requirement↔resume rows and gaps are first-class, not a black-box %.
- One agent, two entry points (Scout vs Optimize) that seed the first user turn. Shared resource-scoped working memory.
- Generative UI: `tool-search-jobs` → JobCard, `tool-clarify` → ClarifyCard, `tool-rewrite-resume` → ResumeArtifact. Do not dump JSON or raw markdown as the hero.

## Current product boundaries

Use `ROADMAP.md` for release boundaries. Do not invent experience or automatically submit applications. The earlier web MVP's limits on resume editing, auth, and application tracking no longer govern the new extension and hosted phases.

## Agent skills

### Issue tracker

GitHub Issues on `phuhien92/job-scout`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles map 1:1 to GitHub labels (`ready-for-agent`, `ready-for-human`, and the rest). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
