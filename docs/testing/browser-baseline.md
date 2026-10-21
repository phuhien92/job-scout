# Browser baseline

Issue #12 adds a deterministic Chromium baseline for the existing website. It
runs at 1440×900 and 375×812. It checks actual navigation and responsive layout,
Scout streaming/job-card rendering, recoverable chat errors, real resume upload
and extraction, profile save/reload, and Optimize's upload-to-critique handoff.

## Run locally

Use Node 24 (also used in GitHub Actions):

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e
```

The runner launches a dedicated Next development server using Webpack at `127.0.0.1:3100`.
That port must be free. An existing development server is never reused. No
model, Findwork, or other API keys are needed. Chat responses and listing tool
results are synthetic AI SDK UI-message streams intercepted by Playwright;
resume uploads, parsing, profile writes, and server rendering use real routes.
External browser HTTP requests and unmocked chat requests are blocked.
This verifies the client streaming contract, not real provider/Findwork behavior
or the server's model invocation. Production builds are outside this baseline.

Every run creates a unique temporary `JOB_SCOUT_DATA_DIR` and removes it on
completion. Tests run with one worker because the current product has one shared
local profile; each test resets only the temporary SQLite database, sidecar files
and legacy JSON backup. Connections close after each request. The app's
normal `.data` directory is untouched. Do not run `npx playwright test` directly:
use the runner so it owns storage setup, server lifetime, and cleanup.

Examples:

```bash
npm run test:e2e -- --project=chromium-mobile
npm run test:e2e -- --headed
npm run test:e2e -- --grep 'resume upload'
npx playwright show-report
```

The fixture resume and employer/job URLs are fictional. Each test also checks
for uncaught browser errors; the route test checks actual desktop/sidebar or
mobile/drawer navigation, and layout assertions check horizontal overflow after
route and populated-flow rendering. Unsupported extension flows are not tested
until issues #22–#24 introduce them.

## CI and failure evidence

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`. Its `check`
job runs `npm ci`, lint, the component catalog check, generated Next route types plus
TypeScript, Vitest and a production build; its `e2e` job runs both Chromium viewport
projects. Both use a read-only repository token and no secrets. Before the tests,
`e2e/global-setup.ts` requests each route once so the development server's first-visit
compiles do not count against a test's timeout.
One retry is allowed on CI; `test.only` is forbidden. Failures upload the HTML
report, screenshots, browser error attachment, and retained traces for seven days.
`playwright-report` and `test-results` are gitignored.

Keep unit tests under `src/**/*.test.{ts,tsx}` and browser specs under
`e2e/**/*.spec.ts`; Vitest must not collect Playwright specs. Add new browser
checks at the user-flow level, reusing mock responses for external dependencies.

## Hydration behavior covered

The baseline caught early clicks on the mobile Menu and Optimize action being lost before React attached their handlers. These controls now stay disabled in server HTML and become enabled after hydration through a shared `useHydrated` hook. The navigation and upload-to-Optimize tests exercise those actions without fixed sleeps or forced clicks.

## Dependency maintenance

`package-lock.json` is the npm CI installation source. The legacy npm lock was
out of sync; this change regenerates it, uses Node 24 types compatible with
Vitest 5, and declares Vite and Testing Library DOM test peers explicitly.
AI SDK/React/Mastra versions are pinned together to avoid incompatible stream
metadata types from independently resolving minor versions. Playwright is pinned
so its browser revision changes only with an explicit dependency update.

The existing pnpm lock is refreshed with `pnpm import` from the npm lock. When
changing dependencies, update the npm lock first, refresh the pnpm lock, then
verify a clean `npm ci` and the suites. Avoid `--legacy-peer-deps`: a clean install
must work with normal peer resolution.
