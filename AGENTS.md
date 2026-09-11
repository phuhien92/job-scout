# Job Scout

Personal AI job-search product. Goal: a live demo that impresses recruiters and hiring managers.

The repo is early. Work is specified as GitHub issues, not as a half-built app. Read this file, then pick the next unblocked `ready-for-agent` issue. Do not invent a new product direction.

Keep `AGENTS.md` and `CLAUDE.md` in sync. Edit both when navigation rules change.

## What we are building

An agent that reads a resume, asks what the person is aiming at, rewrites toward that target without inventing facts, then searches live jobs and scores them.

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

Start with issues whose Blocked by is none or already closed. Today that is usually [#1](https://github.com/phuhien92/job-scout/issues/1) (shell) and [#4](https://github.com/phuhien92/job-scout/issues/4) (resume upload), in parallel after the shell exists.

| Issue | Slice | Blocked by |
| --- | --- | --- |
| [#1](https://github.com/phuhien92/job-scout/issues/1) | Product shell on the design system | none |
| [#2](https://github.com/phuhien92/job-scout/issues/2) | Live job search through chat | #1 |
| [#3](https://github.com/phuhien92/job-scout/issues/3) | Scout home with job cards | #2 |
| [#4](https://github.com/phuhien92/job-scout/issues/4) | Upload a resume into working memory | #1 |
| [#5](https://github.com/phuhien92/job-scout/issues/5) | Optimize: critique the resume in chat | #4 |
| [#6](https://github.com/phuhien92/job-scout/issues/6) | Optimize: targeting questions in-thread | #5 |
| [#7](https://github.com/phuhien92/job-scout/issues/7) | Optimize: resume artifact with download and save | #6 |
| [#8](https://github.com/phuhien92/job-scout/issues/8) | Jobs split view and Browse roles handoff | #3, #7 |

## Stack

- Next.js App Router, React 19, Vercel-ready
- Mastra agent, tools, LibSQL memory
- `@robr0/design-system` for every visible control
- AI SDK UI (`@mastra/ai-sdk` + `useChat`) mapped onto DS chat primitives
- Zod on every tool
- Findwork for listings (typed adapter). Match scores are ours. Do not wrap FoundRole as the product backend.

Env (when the app exists): `MODEL` plus the matching provider key, `FINDWORK_API_KEY`.

## Design system

Package: [`@robr0/design-system`](https://github.com/robritacca-dotcom/design-system). Contracts: `node_modules` `.d.ts`, [component markdown](https://robertritacca.com/components/chat-thread.md), MCP `https://robertritacca.com/api/mcp`. Vendor the consumer skill when scaffolding:

```bash
curl --create-dirs -o .claude/skills/robr0-design-system/SKILL.md https://robertritacca.com/skill/robr0-design-system/SKILL.md
curl --create-dirs -o .claude/skills/robr0-design-system/references/components.md https://robertritacca.com/skill/robr0-design-system/references/components.md
```

Rules:

- Import `@robr0/design-system/tokens/tokens.css` once. Semantic tokens only. No hex, no `--primitive-*` in app CSS, no Tailwind colour utilities.
- Default `data-theme="dark"`. Leave the teal ramp alone.
- Teal means "click here". Never decoration, never chat-bubble fill.
- AI gradient only on AI affordances (`Composer aiGlow`, `AiButton`).
- Nunito Sans via `next/font` into `--font-family-primary`.
- `SplitPane` takes two children. Nest for three columns.
- `InterruptCard` is allow/deny. Targeting questions use a composed ClarifyCard (`Panel` + `RadioGroup` + Skip/Continue).
- `Composer` does not clear on submit. Clear after a successful send.
- ShaderField: paint the CSS fallback only on `unavailable`, not `pending`. Mount once from the root layout.

Copy: sentence-case labels, no emoji, no em dashes in product UI.

## Agent rules

- Tools are the only things that touch the world. Never invent jobs, URLs, employers, or resume metrics. Rewrites are evidence-only (optional fact-gate against source text); adaptive framing only.
- Match scores are explainable and multi-factor (2–3 dimensions + Strong Fit / Stretch / Long-shot bands). Hard blockers (remote/geo etc.) stay separate from the fit band. Requirement↔resume rows and gaps are first-class, not a black-box %.
- One agent, two entry points (Scout vs Optimize) that seed the first user turn. Shared resource-scoped working memory.
- Generative UI: `tool-search-jobs` → JobCard, `tool-clarify` → ClarifyCard, `tool-rewrite-resume` → ResumeArtifact. Do not dump JSON or raw markdown as the hero.

## Out of scope for v1

FoundRole as listings backend. Cloning FoundRole, Glassdoor, or LinkedIn visuals. Visual resume editor, track-changes, designed PDF/DOCX. Inventing experience. Multi-resume library beyond last upload plus one saved optimized version. Auth, job tracker, second job source, evals dashboards.

## Agent skills

### Issue tracker

GitHub Issues on `phuhien92/job-scout`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles map 1:1 to GitHub labels (`ready-for-agent`, `ready-for-human`, and the rest). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.
