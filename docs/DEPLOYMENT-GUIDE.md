# 🚀 NEXUS Platform - Vercel & Supabase Deployment Guide

This guide covers deploying the NEXUS project to production using Vercel for the frontend/backend and Supabase for the database and authentication.

---
## **Prerequisites**
- A **Vercel** account.
- A **Supabase** project.
- Your project code pushed to a GitHub repository.

---
## **1. Supabase Project Setup**

1.  **Create a Project**: Go to supabase.com and create a new project.
2.  **Get Project Details**: In your project dashboard, go to **Project Settings > API**. You will need the **Project URL** and the `anon` **public key**.
3.  **Get JWT Secret**: Also in the API settings, find the **JWT Secret**. This is a private key used by your backend to verify tokens.
4.  **Run Migrations**: To apply your local database schema to the production Supabase instance, run the following command:
    \`\`\`bash
    # You will be prompted for your production database password
    pnpm --filter nexus-backend db:push
    \`\`\`

---
## **2. Vercel Project Setup & Deployment**

1.  **Import Project**: In your Vercel dashboard, click "Add New... > Project" and import your GitHub repository.
2.  **Configure Project**:
    - **Framework Preset**: Vercel should auto-detect `Vite`.
    - **Root Directory**: Set this to `web`.
    - **Build & Output Settings**: Vercel's defaults for Vite are usually correct.
3.  **Add Environment Variables**: Go to the project's **Settings > Environment Variables** and add the following:
    - `VITE_SUPABASE_URL`: Your Supabase project URL (public).
    - `VITE_SUPABASE_ANON_KEY`: Your Supabase `anon` key (public).
    - `VITE_TURNSTILE_SITE_KEY`: Your Cloudflare Turnstile Site Key (public, for the frontend).
    - `SUPABASE_JWT_SECRET`: Your Supabase JWT Secret (private, for the backend API).
    - `TURNSTILE_SECRET`: Your Cloudflare Turnstile Secret Key (private, for the backend API).
    - `DATABASE_URL`: Your Supabase database connection string (private, for the backend API).

4.  **Deploy**: Vercel will automatically deploy the `main` branch upon every push.

To deploy the application, simply push your code to the branch connected to your trigger:
\`\`\`bash
git push origin main
\`\`\`

Your application is now live on the domain provided by Vercel.
