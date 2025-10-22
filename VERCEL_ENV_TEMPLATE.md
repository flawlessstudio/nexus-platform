# Vercel Environment Variables — Template

Copy these environment variable names into your Vercel Project → Settings → Environment Variables. Mark secrets as "Protected"/"Secret" in the Vercel UI (do not prefix secret names with `VITE_`). Only variables needed in the browser should be prefixed with `VITE_`.

## Public (frontend build-time) — prefix with `VITE_`
- VITE_SUPABASE_URL: Your Supabase project URL (public)
- VITE_SUPABASE_ANON_KEY: Supabase anon/public key (public)

Note: Variables prefixed with `VITE_` will be embedded into the client bundle at build time and are not secret.

## Private / Server (do NOT prefix with `VITE_`) — server-only secrets
- SUPABASE_URL: Supabase project URL (server)
- SUPABASE_ANON_KEY: Supabase anon/public key (server)
- SUPABASE_SERVICE_KEY: Supabase service_role key (secret)
- DATABASE_URL: Database connection string (secret)
- SUPABASE_JWT_SECRET: JWT secret used with Supabase (secret)
- STRIPE_KEY: Stripe secret key (sk_..., secret)
- STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret (whsec_..., secret)
- OPENAI_API_KEY: OpenAI secret key (sk-..., secret)
- SENTRY_DSN: Sentry DSN for backend monitoring (secret)
- TURNSTILE_SECRET: Cloudflare Turnstile secret (secret)

## Optional / CI secrets
- SENTRY_AUTH_TOKEN: If you upload source maps/releases from CI
- GH_PAT: GitHub token for CI that pushes releases (if required)

## Notes and recommendations
- Keep service_role keys and secret keys only in the Project Settings (Environment Variables) in Vercel and do NOT commit them anywhere.
- For preview deployments: consider adding the same env vars in the `Preview` scope so PR previews work.
- For local development: create a `backend/.env` file (ignored by git) with the server variables and a `web/.env` with `VITE_` prefixed public keys.
- If you need Sentry release mapping, add `SENTRY_AUTH_TOKEN` to GitHub Actions secrets and configure the action to upload source maps after successful Vercel build.

## Example `.env` (local, backend)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=anon_...
SUPABASE_SERVICE_KEY=service_role_...
DATABASE_URL=postgres://user:pass@host:5432/dbname
STRIPE_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
SENTRY_DSN=https://...
TURNSTILE_SECRET=...
```

## Example `.env` (local, web)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=anon_...
```

If you want, I can create a small script to export these names into the Vercel CLI or create a markdown checklist you can paste into the Vercel UI.
