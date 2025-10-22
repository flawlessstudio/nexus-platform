# Vercel setup & deploy (for Nexus Platform)

This file contains exact steps and Windows `cmd.exe` commands to import the repository into Vercel, set environment variables, and trigger a deploy.

## 1) Import repo (web UI)
- Go to https://vercel.com/dashboard -> New Project -> Import Git Repository
- Choose the `flawlessstudio/nexus-platform` repository
- Root: project root (leave default). `vercel.json` already configures builds for `web` and `backend`.
- Click Import.

## 2) (Optional) CLI: Install vercel and login
Install Vercel CLI if you prefer working from the terminal.

```cmd
npm i -g vercel
vercel login
```

## 3) Set Environment Variables (example, set these in Vercel Project → Settings → Environment Variables)
- VITE_SUPABASE_URL (public)  
- VITE_SUPABASE_ANON_KEY (public)  
- SUPABASE_URL (server)  
- SUPABASE_ANON_KEY (server)  
- SUPABASE_SERVICE_KEY (server secret)  
- DATABASE_URL (server secret)  
- SUPABASE_JWT_SECRET (server secret)  
- STRIPE_KEY (secret)  
- STRIPE_WEBHOOK_SECRET (secret)  
- OPENAI_API_KEY (secret)  
- SENTRY_DSN (secret)  
- TURNSTILE_SECRET (secret)

Set them in Production and Preview scopes as needed. For Vite public values, prefix with `VITE_`.

## 4) Trigger a manual deploy (CLI)

```cmd
cd C:\Users\Admin\Desktop\nexus-platform
vercel --prod
```

Or push to `main` and Vercel will auto-deploy.

## 5) Verify endpoints after deploy
- Frontend: https://<project>.vercel.app/
- Health: https://<project>.vercel.app/health
- Ping: https://<project>.vercel.app/api/ping

If you set Stripe webhooks, point them to:  
https://<project>.vercel.app/api/payments/webhook  (confirm path in `backend/src/routes/payments.js`)
