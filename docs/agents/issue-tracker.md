# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues on `phuhien92/job-scout`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters
- **Next work**: `gh issue list --label ready-for-agent --state open`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`. `gh` does this automatically when run inside a clone.

v1 slices are issues #1–#8. Pickup order and blockers live in `AGENTS.md` / `CLAUDE.md`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue. Implementation slices that an AFK agent can pick up get the `ready-for-agent` label.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
