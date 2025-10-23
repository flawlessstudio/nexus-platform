# Deploying to Vercel (Web + API)

This project deploys a Vite web app and a Node (Express) API on Vercel.

## 1) Requirements

- Vercel account and project linked to this GitHub repo
- Node 20+, PNPM installed locally
- Secrets configured (see below)

## 2) Secrets and Environment Variables

There are two kinds of secrets:

- GitHub Actions secrets (for CI deploys)
  - `VERCEL_TOKEN` — Vercel personal access token
  - `VERCEL_ORG_ID` — your Vercel org ID (see `.vercel/project.json`)
  - `VERCEL_PROJECT_ID` — your Vercel project ID (see `.vercel/project.json`)
  - Add in: GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret

- Vercel Project Environment Variables (used by your app)
  - Add in: Vercel Dashboard → Project → Settings → Environment Variables
  - Common keys:
    - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, (optionally `SUPABASE_SERVICE_KEY` for server-side)
    - `STRIPE_KEY`, `STRIPE_WEBHOOK_SECRET`
    - `OPENAI_API_KEY`
    - `TURNSTILE_SECRET`
    - `SENTRY_DSN`

> Do not rely on `backend/.env` in Vercel. Put runtime envs in the Vercel UI.

## 3) Build + Routing

- `vercel.json` (root) pins Node 20 for the backend function and configures routing:
  - `/api/*` → `backend/src/server.express.js` (serverless)
  - Static web output via `@vercel/static-build` from `web/` (Vite)
  - SPA fallback is enabled so deep links render `index.html`

## 4) CI/CD options

- Auto deploy on push: connect GitHub repo in Vercel (recommended)
- CI deploy (GitHub Actions): uses `amondnet/vercel-action@v25`
  - Production deploy job now runs only for tags (`v*`) or manual dispatch
  - Preview deploy job runs on PRs from this repo (not from forks)

## 5) Typical flow

1. Build locally (optional):
   ```bash
   pnpm --filter nexus-web build
   ```
2. Push to main (runs Build + Doctors)
3. Deploy
   - Auto via Vercel GitHub integration (push to main)
   - or manual prod deploy via Actions → Test and Deploy → Run workflow (uses secrets)
   - or tag a release `vX.Y.Z` to auto-trigger prod deploy in CI

## 6) Troubleshooting

- 404 on Vercel root or deep links:
  - We added SPA fallback in `vercel.json` so `/index.html` serves for unmatched routes
  - Ensure `web/package.json` has `build": "vite build"` (it does) and that the build succeeds

- CI install failures:
  - Lockfile is committed and CI has a fallback (`--frozen-lockfile || install`)

- Missing secrets:
  - Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` to GitHub Actions secrets
  - Add runtime envs (Supabase, Stripe, etc.) in Vercel Project settings

- Stripe webhooks in Vercel:
  - Ensure `STRIPE_WEBHOOK_SECRET` is set in Vercel envs
  - Stripe endpoint path: `/api/payments/webhook` (handled by Express router)

## 7) Useful Commands

- Manual deploy via CLI:
  ```bash
  vercel login
  vercel link
  vercel deploy --prod
  ```
- Trigger CI workflows manually:
  - Actions UI → select workflow → Run Workflow (branch: `main`)
- Artifacts & summaries:
  - Build uploads `web/dist`
  - Doctors uploads `reports/doctors.txt`
  - Readiness uploads `reports/readiness_doctor_report.md`

