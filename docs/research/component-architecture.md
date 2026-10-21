# Job Scout component architecture research

Research date: 2026-10-20. Scope: the open-source local website and the planned Manifest V3 autofill extension, with a later hosted mode. **Decision constraint:** do not use `@robr0/design-system` for new work; remove it from the existing website through issue #17.

## Findings from the repository

- The website is Next.js 16.3.4 and React 19.2.8. `package.json` already includes Tailwind CSS 4, `shadcn`, `@base-ui/react`, and `class-variance-authority`, as well as `@robr0/design-system`. `components.json` selects shadcn's `base-nova` style and `src/components/ui` as the local primitive location.
- `src/components/ui` already contains locally owned shadcn components built on Base UI: button, input, select, dialog, tooltip, menu, and more. Existing source files still import `@robr0/design-system`. `src/app/globals.css` maps shadcn semantics to generated Job Scout tokens, while `src/app/layout.tsx` temporarily imports the old package's token CSS for uncovered legacy component roles. Removing only the package dependency would still break those components.
- The Pen workflow spans the website, extension pairing, fill preview, final review, recovery states, and profile maintenance (`design/README.md`). Its approved light variable values are the token source for generated implementation CSS; dark values are dormant, and its frames and reusable components remain design proposals. Pen supports variables with theme values, reusable components, and syncing CSS variables with design files. [Pen variables](https://docs.pen.dev/core-concepts/variables), [Pen components](https://docs.pen.dev/core-concepts/components), [Pen design and code](https://docs.pen.dev/design-and-code/design-to-code).

## Recommended architecture

Use **local shadcn component source on Base UI**, a small Job Scout semantic token set, and separate surface shells. This follows the shadcn model: component source is copied into and owned by the project, with `components.json` governing generation; Base UI supplies unstyled, accessible interaction primitives. [shadcn local source](https://ui.shadcn.com/docs/new), [shadcn configuration](https://ui.shadcn.com/docs/components-json), [Base UI overview](https://base-ui.com/react/overview/about).

```text
design/job-scout.pen                  reviewable flows and token/component references
packages/ui/
  src/styles/tokens.css              canonical semantic CSS variables, approved light values
  src/styles/base.css                Tailwind @theme bridge, base styles, focus rules
  src/components/                   owned shadcn/Base UI primitives only
  src/patterns/                     portable UI patterns: status, evidence, review rows
  package.json                      explicit exports for styles and components
apps/web/                            Next.js routes, shell, i18n, server/client wiring
apps/extension/                      MV3 side panel/popup, worker, content script
packages/application-contract/       versioned data schemas, no React or browser APIs
```

This is a **target layout**, not an instruction to move every file immediately. The shadcn monorepo guide documents the shared UI package pattern, matching `components.json` files, and explicit exports. If extraction would slow issue #17, first consolidate tokens and primitives under the current `src/components/ui`; extract to `packages/ui` when extension UI is started. [shadcn monorepo guide](https://ui.shadcn.com/docs/monorepo).

### Package boundaries

| Layer | Share across web and extension | Keep surface-specific |
| --- | --- | --- |
| Tokens | Semantic color, type, spacing, radius, elevation, focus styles | Theme persistence and root selector: website `html`, extension panel root |
| Primitives | Button, Field, Dialog, Select, Tabs, Tooltip; owned code over Base UI | Portal container and any browser-specific integration |
| Product patterns | `EvidenceBadge`, `ReviewStatus`, `FieldAnswerRow`, `UnresolvedQuestion`, `ConnectionState`; accept data and callbacks | Navigation, route links, file upload, AI provider setup, application DOM access |
| Data | Versioned application-plan and profile/fact schemas | Next server handlers, extension messages, local companion transport |

Keep Next.js imports (`next/link`, `next/navigation`, server-only code), Chrome APIs, AI SDK hooks, and local-companion fetches **out of `packages/ui`**. Use adapters in each app to provide navigation, translations, and actions as props. Next.js pages/layouts are Server Components by default; interactive UI uses narrow client boundaries. This makes shared UI importable into an extension that renders with React `createRoot`, without importing a Next.js runtime. [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [React `createRoot`](https://react.dev/reference/react-dom/client/createRoot). The separation is an architectural inference from those runtime contracts.

### Tokens and styling

The approved light Pen values generate the project-owned `--js-*` semantic values in `src/styles/tokens.css`; `src/app/globals.css` maps them to shadcn's `--background`, `--foreground`, `--primary`, and related roles in one bridge. The generator deliberately leaves dark Pen values dormant and verifies approved light text/surface pairs. Legacy component-only typography, border-width, interaction, and motion roles remain supplied by `@robr0/design-system` until issue #17 migrates those components; do not extend that compatibility boundary. Tailwind 4 `@theme` creates utility names from theme variables; ordinary `:root` variables are appropriate for values that should not generate utilities. A shared CSS file can be imported by both apps. [Tailwind theme variables](https://tailwindcss.com/docs/theme), [shadcn theming](https://ui.shadcn.com/docs/theming).

Configure each app's stylesheet to scan shared UI sources explicitly with Tailwind `@source` if its workspace layout is not included by automatic scanning; do not build utility class names dynamically from unbounded data. [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files). Scope extension styles to the panel document. If a future in-page overlay is needed, mount it in a dedicated Shadow DOM root and verify overlay portals/focus/keyboard behavior there; the primary fill UI should live in the extension side panel. This Shadow DOM choice is a recommendation to reduce page-style collisions, not a Chrome requirement.

Pen owns these reviewed semantic variables and should use component instances for controls repeated across the journey. Only the approved light values are currently implemented; dark values remain dormant until a later review. Regenerate CSS with `npm run tokens:generate` after changing the variables; `npm run tokens:check` catches drift. Pen documents variables, theme axes, aliases, and CSS synchronization, but design changes still need review. [Pen variables](https://docs.pen.dev/core-concepts/variables), [Pen design and code](https://docs.pen.dev/design-and-code/design-to-code).

### Extension composition and accessibility

Prefer a React side panel for the multi-step review because Chrome's side panel can remain alongside the page and has extension API access. Keep the popup for concise status and a launch action. Keep the content script focused on form detection and applying user-approved values; it should not import the component package or render the full review UI. The extension service worker coordinates messages and backend calls. Chrome documents side panel behavior, content-script isolation, and messaging between contexts. [Chrome side panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging).

Base UI handles many roles, keyboard interactions, and focus transitions, but the product must still supply visible focus, accessible labels, and sufficient foreground/background contrast. Add keyboard and screen-reader checks to the shared primitives and each critical flow (pairing, field review, unresolved questions, final review). For dynamic answer/status updates, ensure announcements and focus movement are deliberate. [Base UI accessibility](https://base-ui.com/react/overview/accessibility), [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/).

Bundle React, Base UI, shared CSS, and icons into the extension package. Manifest V3 does not allow remotely hosted executable code. The extension may fetch **data** from the local companion or hosted API through its permitted transport; fetched responses must not be evaluated as UI code. [Chrome MV3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3), [Chrome extension security](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security).

## Migration sequence for issue #17

### Existing component migration map

| Existing imports | Replacement boundary | Rationale |
| --- | --- | --- |
| `Button`, `Input`, `Textarea`, `Field`, `RadioGroup`, `TagInput`, `FileInput`, `DocumentChip` | Local Base UI/shadcn controls for button, field, input, textarea, radio, and file picker; compose tag input and document chip in `apps/web` until reuse is proven | These are primitive controls or website-specific upload interactions. Base UI provides an unstyled component layer that can be styled locally. [Base UI components](https://base-ui.com/react/components) |
| `Panel`, `Alert`, `EmptyState`, `SelectionCard` | Local card/alert primitives plus product patterns for selection and empty states | A panel is a visual surface; selection state and domain copy belong to product compositions. [shadcn local source](https://ui.shadcn.com/docs/new) |
| `AppSidebar`, `Nav`, `NavList`, `Drawer`, `Divider`, `SegmentedControl` | Website `AppShell` composition using local navigation, separator, segmented controls and Base UI dialog for mobile drawer | The website shell depends on Next routing and i18n, so it stays in `apps/web`; the extension gets its own compact shell. [Next.js client boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Base UI accessibility](https://base-ui.com/react/overview/accessibility) |
| `ChatHeader`, `ChatMessage`, `ChatThread`, `Composer`, `PromptSuggestions`, `Prose`, `AgentStatus` | Product chat components in `apps/web`, using existing AI Elements where useful and local primitives underneath | These components know about AI stream state and app behavior. Share only generic `Status`/`Evidence` pieces with extension. The repo already contains `src/components/ai-elements`. |
| `ToastProvider`, `useToast` | One local toast implementation at website root, with a future extension-root provider if needed | Each React root owns its notifications and focus behavior. [React `createRoot`](https://react.dev/reference/react-dom/client/createRoot) |

This is a **design mapping**, not a claim of one-to-one API compatibility. Inspect each caller's current behavior and tests before replacing it.

1. Inventory each `@robr0/design-system` import and map its contract to a local primitive or surface composition. Start with the shell, since it currently owns navigation, drawer, and locale controls. Preserve behavior at 375px and 1440px while replacing visual pieces.
2. Generate Job Scout's approved light semantic token set in local CSS and keep the shadcn bridge project-owned. Issue #37 establishes this contract; issue #17 removes the remaining legacy component token import after those components and uncovered roles migrate.
3. Reuse the existing Base UI-backed `src/components/ui` files, fixing their visual and accessibility states against the Pen flow. Add local primitives only when a repeated interaction requires one. Do not install a second primitive stack such as Radix for the same controls without a demonstrated gap.
4. Migrate feature compositions in slices: shell/profile, Scout/Optimize, then jobs. Keep feature state and i18n in app components, not generic UI primitives. Remove the old package and old token references only after the imports and tests are clear.
5. When extension implementation begins, extract the stable primitives/tokens and portable patterns into `packages/ui` with explicit exports. Build the extension side panel against that package. Test both web and extension builds to catch Tailwind scanning and package boundary errors.

**Acceptance evidence:** no `@robr0/design-system` import or dependency; no CSS reference to its token names; website build and existing behavioral tests pass; responsive shell and Pen-profile interactions reviewed; supported theme and keyboard/focus states checked; extension bundle has no remote executable code. These are proposed acceptance checks, not claims that migration has happened.

## Open decisions to resolve during implementation

- Whether the extension needs an in-page overlay at all. The side panel can support the planned review flow without one; a future overlay needs isolation and focus tests.
- Whether shared UI extraction should be done in issue #17 or when the extension starts. The low-risk sequence is local cleanup first, extraction after stable primitives exist.

## Animation decision

User direction (October 20, 2026): use Framer Motion when new product animation is needed. Respect reduced-motion preferences and preserve focus, keyboard access, and readable application review states. Keep animation in surface UI rather than the shared application-plan contract. Introduce the dependency with the first animation implementation; the testing baseline does not add animated UI.
