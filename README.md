# Job scout

Job Scout is building toward helping a job seeker find roles, tailor their resume, and manage applications in one place. The [roadmap](ROADMAP.md) extends it into an open-source local application assistant with a browser autofill extension and a later paid hosted service. The extension and hosted service are planned work, not current features. It is a Next.js (React 19) app with four areas reachable from a shared, responsive navigation shell (sidebar on desktop, drawer on mobile):

- **Scout** — a search chat for finding open roles that match what you are looking for.
- **Optimize** — targeting questions and a resume artifact tailored to a specific role, with download and save.
- **Jobs** — a split view for browsing and managing roles you have saved.
- **Profile** — your resume, targeting preferences, and account details.

## Design system

The current UI still has legacy `@robr0/design-system` imports; do not add new use of that package. [Component architecture research](docs/research/component-architecture.md) defines the proposed Job Scout-owned replacements, and [issue #17](https://github.com/phuhien92/job-scout/issues/17) tracks migration to shadcn + Base UI. New application and extension journeys will be designed in pen.dev, with their editable flow linked from the implementation issues.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the model and Findwork API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — lint the codebase
- `npm run test` — run the Vitest test suite
