<p align="center">
  <img src="design/brand/scout-rabbit-bubble.png" alt="Job Scout rabbit with a loupe inside a green thought bubble" width="160">
</p>

# Job Scout

Job Scout is building toward helping a job seeker find roles, tailor their resume, and manage applications in one place. The [roadmap](ROADMAP.md) extends it into an open-source local application assistant with a browser autofill extension and a later paid hosted service. The extension and hosted service are planned work, not current features. It is a Next.js (React 19) app with four areas reachable from a shared, responsive navigation shell (sidebar on desktop, drawer on mobile):

- **Scout** — a search chat for finding open roles that match what you are looking for.
- **Optimize** — targeting questions and a resume artifact tailored to a specific role, with download and save.
- **Jobs** — a split view for browsing and managing roles you have saved.
- **Profile** — your resume, targeting preferences, and account details.

## Design system

The current UI uses [`@robr0/design-system`](https://www.npmjs.com/package/@robr0/design-system). [Issue #17](https://github.com/phuhien92/job-scout/issues/17) tracks migration to shadcn + Base UI. New UI uses the local shadcn + Base UI primitives; do not add new dependencies on the legacy library. See the [component architecture research](docs/research/component-architecture.md) for migration and shared UI boundaries. New application and extension journeys are designed in pen.dev, with their editable flow linked from the implementation issues.

## Getting started

Use Node 24.

```bash
npm ci
cp .env.example .env.local   # fill in the model and Findwork API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — lint the codebase
- `npm run test` — run the Vitest test suite
- `npm run typecheck` — generate Next route types and check TypeScript
- `npm run test:e2e` — run isolated Chromium smoke tests at mobile and desktop widths

See the [browser baseline guide](docs/testing/browser-baseline.md) for browser installation, fixtures, storage isolation, and PR CI reports.

## Shared application contract

The [application-plan v1 contract](docs/application-plan.md) defines validated review data shared by the planned extension and local/hosted backends. It includes a synthetic Rippling fixture and deterministic tests; it does not yet scan or fill live forms.

Local profile storage uses SQLite at `JOB_SCOUT_DATA_DIR/job-scout.db` (default `.data/`). Existing JSON migrates automatically and stays as a backup. See [profile storage and portable backups](docs/application-profile.md).
