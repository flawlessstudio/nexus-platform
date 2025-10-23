# 🌍 NEXUS - Your Immigration Journey Made Simple

[![CI](https://github.com/flawlessstudio/nexus-platform/actions/workflows/build-check.yml/badge.svg)](https://github.com/flawlessstudio/nexus-platform/actions/workflows/build-check.yml)
[![Doctors](https://github.com/flawlessstudio/nexus-platform/actions/workflows/doctors.yml/badge.svg)](https://github.com/flawlessstudio/nexus-platform/actions/workflows/doctors.yml)

NEXUS is a secure and scalable immigration platform built on a modern, full-stack architecture. This repository contains the lean v1, optimized for a solo operator using Vercel and Supabase.

## ✨ What's Included?

This is a `pnpm` monorepo containing:
- `backend/`: A Node.js/Express API.
- `web/`: A Vite-powered React frontend.
- `tools/`: Auditing and automation scripts.
- `.github/`: CI/CD workflows for auditing, testing, and deployment.

## 🚀 Getting Started (v1 Stack)

Get NEXUS running locally in under 10 minutes. For a more condensed version, see the Quick Start Guide.

### **Prerequisites**

- **Node.js**: v20 or higher (see `.nvmrc`)
- **pnpm**: `npm install -g pnpm`
- **Supabase CLI**: Follow the official installation guide. (e.g., `npm install -g supabase` or `brew install supabase/tap/supabase`)
- **Vercel CLI**: `npm install -g vercel`

### **Setup**

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/oneflawlessstudio/nexus-platform.git
    cd nexus-platform
    ```
2.  **Install Dependencies**:
    This command installs dependencies for all active workspaces (`web`, `backend`).
    ```bash
    pnpm install
    ```
3.  **Start Local Supabase Services**:
    This command starts the local Supabase stack (Postgres, GoTrue Auth, Storage, etc.). Your Supabase keys and DB URL will be printed in the terminal.
    ```bash
    supabase start
    ```
4.  **Configure Environment Files**:
    Copy the example environment file for the backend and create a new one for the frontend.
    ```bash
    # For the backend
    cp backend/.env.example backend/.env
    # For the frontend
    touch web/.env
    ```
    - In `backend/.env`, paste the `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` from the `supabase start` output.
    - In `web/.env`, add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the `supabase start` output.

5.  **Configure Bot Protection (Optional)**:
    For features like bot protection, you'll need to create a free Cloudflare Turnstile key for `localhost`.
    - In `backend/.env`, add the **Secret Key** as `TURNSTILE_SECRET`.
    - In `web/.env`, add the **Site Key** as `VITE_TURNSTILE_SITE_KEY`.

6.  **Run Database Migrations**:
    This applies the database schema to your local Supabase instance.
    ```bash
    pnpm --filter nexus-backend db:push
    ```
7.  **Start All Development Servers**:
    This runs the `dev` script in all workspaces (`web`, `backend`) concurrently.
    ```bash
    pnpm dev
    ```

### **Accessing the Apps**
* **Web App**: `http://localhost:5173` (Vite default)
* **Backend API**: `http://localhost:4000`
* **Supabase Studio**: `http://localhost:54323`

## 🩺 Project Health & Auditing

This project includes powerful auditing scripts in the `tools/` directory to enforce best practices and check for configuration issues.

- **`readiness_doctor.mjs`**: Checks for security and deployment readiness.
- **`v1_guardian.mjs`**: Enforces v1 architecture and best practices.
- **`v2_guardian.mjs`**: Enforces v2 architecture and best practices.

To run an audit manually:
```bash
node tools/readiness_doctor.mjs --apply
```

To run the audit and automatically open the generated report in your browser:
```bash
node tools/readiness_doctor.mjs --open
```

## 🚀 Deployment

This project is optimized for deployment on Vercel (frontend) and Supabase (database/auth).

For detailed, step-by-step instructions, please see the Deployment Guide.

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
