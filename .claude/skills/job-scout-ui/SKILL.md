---
name: job-scout-ui
description: Build or change any Job Scout UI (a page, a product component, a form, a dialog, a chat surface). Lists every reusable component the app owns and the rules for composing them. Use before writing JSX, and instead of the legacy robr0-design-system skill.
---

# Building Job Scout UI

Every control comes from Job Scout's own components. The full list, with props and variants, is
generated from source in [references/components.md](references/components.md). Read it before
writing JSX; it is the complete inventory, not a sample.

## Rules

- **Use a listed component.** If the catalog has it, use it with its declared variants. Do not
  restyle a primitive with one-off classes to get a new look; add a variant to the primitive
  instead, so the next caller gets it too.
- **Compose before creating.** A missing piece is usually a composition of listed primitives
  inside a product component in `src/components`. Add a new file to `src/components/ui` only when
  the same interaction repeats across surfaces, and say why in the PR.
- **Adding a primitive:** `pnpm dlx shadcn@latest add <name>` (the `base-nova` style in
  `components.json` keeps it on Base UI), then `node scripts/ui-catalog.mts` and commit the
  regenerated catalog. CI fails while it is stale.
- **Never import `@robr0/design-system`** in new code. ESLint blocks it outside the files issue #17
  is still migrating. When you migrate one of those files, remove it from the allowlist in
  `eslint.config.mjs`.
- **No raw `<button>`, `<input>`, `<textarea>`, `<select>` or `<dialog>`** in product code.
  ESLint blocks them outside `src/components/ui` and `src/components/ai-elements`.
- Product components take data and callbacks; primitives know nothing about jobs, resumes or
  routes (`docs/research/component-architecture.md`).
- Copy: sentence-case labels, no emoji, no em dashes. Every user-facing string goes through
  next-intl, in both `messages/en.json` and `messages/vi.json`.

## Which component for which need

| Need | Use |
| --- | --- |
| Action, link-styled action, icon action | `Button` (`variant`, `size`) |
| Several related actions side by side | `ButtonGroup` |
| Single-line text | `Input`, or `InputGroup` with addons or an inline button |
| Multi-line text | `Textarea`, or `InputGroupTextarea` |
| Choose one of a fixed list | `Select` |
| Modal task or confirmation | `Dialog` |
| Searchable list or command palette | `Command`, `CommandDialog` |
| Menu of actions | `DropdownMenu` |
| Short hint on hover or focus | `Tooltip` |
| Richer preview on hover | `HoverCard` |
| Visual divider | `Separator` |
| Loading indicator | `Spinner` |
| Chat thread, messages, composer | `Conversation`, `Message`, `PromptInput` (chat elements) |

## Replacing a legacy import (issue #17)

The mapping is in `docs/research/component-architecture.md` under "Existing component migration
map". It is a design mapping, not an API match: read the caller's behaviour and tests first.
