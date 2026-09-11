# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`AGENTS.md`** and **`CLAUDE.md`** (keep them identical) for product goal, pickup order, stack, and design-system rules
- **`CONTEXT.md`** at the repo root, if it exists
- **`docs/adr/`** — read ADRs that touch the area you're about to work in

If `CONTEXT.md` or `docs/adr/` do not exist, proceed silently.

## File structure

Single-context repo:

```
/
├── AGENTS.md
├── CLAUDE.md
├── CONTEXT.md          ← optional, created when terms need a glossary
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

Prefer the terms in `AGENTS.md` until a `CONTEXT.md` exists: Scout, Optimize, Jobs, Profile, JobCard, ClarifyCard, ResumeArtifact, working memory, search-jobs, score-jobs. Do not rename these in issues or UI.

If your output contradicts a locked v1 decision in `AGENTS.md` (Findwork not FoundRole, DS tokens not a cloned palette, Browse → `/jobs`), surface it explicitly rather than silently overriding.
