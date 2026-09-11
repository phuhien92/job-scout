# Job scout

Job scout helps a job seeker find roles, tailor their resume, and track applications in one place. It is a Next.js (React 19) app with four areas reachable from a shared, responsive navigation shell (sidebar on desktop, drawer on mobile):

- **Scout** — a search chat for finding open roles that match what you are looking for.
- **Optimize** — targeting questions and a resume artifact tailored to a specific role, with download and save.
- **Jobs** — a split view for browsing and managing roles you have saved.
- **Profile** — your resume, targeting preferences, and account details.

## Design system

Every visible control comes from [`@robr0/design-system`](https://www.npmjs.com/package/@robr0/design-system). The app imports the token stylesheet once, loads Nunito Sans into the `--font-family-primary` token, and defaults to `data-theme="dark"` with a theme toggle that switches to light. A consumer skill for the design system is vendored at `.claude/skills/robr0-design-system/` so agents working in this repo follow its install, theming, and prop-contract rules.

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
