#!/bin/bash
set -euo pipefail

# Define the output directory for prompts
PROMPT_DIR="docs/prompts"

# Ensure the prompt directory exists
mkdir -p "$PROMPT_DIR"

# Helper function to write content to a prompt file
# Usage: write_prompt "filename.prompt" <<'EOF'
#        ... content ...
#        EOF
write_prompt() {
  local filename="$1"
  echo "Writing prompt to $PROMPT_DIR/$filename..."
  cat > "$PROMPT_DIR/$filename"
}

# --- v1: Refactor, Clean, Ship
write_prompt "launch_and_ship_v1.prompt" <<'EOF'
SYSTEM ROLE:
Lead Architect for nexus-platform. Perform a repo-wide refactor a solo operator can run. Ship a lean, secure, observable v1.

PRIMARY GOAL:
Make the project deployable, safe, and monetizable with minimal surface area. Prefer managed services.

REPO-WIDE REFACTOR & CLEANUP MANDATE:
- Scope: root, backend, web, admin, mobile, .github, docs, infra.
- You MAY create/rename/move/delete to simplify. BEFORE any deletion: output a DRY-RUN list and append /docs/MIGRATION_LOG.md with rationale + git restore cmds.
- Normalize monorepo: pnpm workspaces; root scripts (dev/build/test/lint/typecheck/e2e/release); .editorconfig; .gitattributes; .nvmrc; ESLint/Prettier (or Biome); tsconfig.base.json & path aliases; Conventional Commits (commitlint).
- Verify local dev: docker-compose OR Supabase CLI emulator; fix/replace if broken.
- Archive unused packages (admin/mobile/etc.) to /archive with a README; exclude from workspace.

LEAN v1 STACK (solo-friendly):
- **Supabase** (DB/Auth/Storage, RLS ON, email verification ON; optional pgvector)
- **Vercel** (web hosting, CDN)
- **Cloudflare DNS + Turnstile** (DNS/WAF/CAPTCHA)
- **Stripe** (Checkout + Webhooks + Customer Portal + Stripe Tax/VAT)
- **OpenAI** (single endpoint)
- **Postmark/SendGrid** (transactional email)
- **Sentry** (front+back); basic RUM via Sentry Browser or PostHog
- **Vitest** (unit) + **Playwright** (smoke)
- **GitHub Actions** (CI/CD)

DELIVERABLES (produce ALL via unified diffs + commands):
1) ROOT & WORKSPACE
   - Curated root package.json: scripts (dev/build/test/lint/typecheck/e2e/release), engines, packageManager: pnpm, lint-staged + husky.
   - pnpm-workspace.yaml only includes active packages; /archive holds paused apps.
   - CODEOWNERS (assign me), PULL_REQUEST_TEMPLATE.md, ISSUE_TEMPLATE.md, RELEASE_DRAFTER.yml, semantic-release config.
   - Secrets scanning: gitleaks/ggshield hook + CI job.
   - .editorconfig, .gitattributes (eol/lf), .nvmrc (Node 20+), LICENSE placeholder.

2) BACKEND (Express OR Supabase Edge shim if offloading logic)
   - /src/utils/env.{js,ts} with **Zod** schema; no direct process.env usage.
   - Security: **helmet** (strict CSP with nonce), cookie-parser, strict CORS, **request-id** middleware (X-Request-ID), body size limits, **pagination defaults & max limits**.
   - Auth: **Supabase Auth**; enable **Passkeys/WebAuthn**; TOTP-ready; device/session listing endpoint; session revoke.
   - Abuse: **Cloudflare Turnstile** server verify on signup/auth; rate limit (per IP + per user) on auth/AI/payments.
   - Email: Postmark/SendGrid templates (verify/reset/receipt). **Set SPF, DKIM, DMARC** notes and DNS entries.
   - Payments `/src/routes/payments.{js,ts}`: **idempotency keys**, webhook signature verify, retries/backoff, **Stripe Customer Portal**, **Stripe Tax** config, proration support, grace periods.
   - AI `/src/services/aiAgent.{js,ts}`: input length caps, model/timeouts, safety filters (refusal on PII upload), minimal caching stub, prompt version tag.
   - **Audit log** append (who/what/when/ip) for auth/billing.
   - **GDPR**: `/export` (JSON bundle + schema) and `/delete` stubs.
   - **OpenAPI** spec + swagger UI route (locked in non-prod).
   - Structured JSON logger (level, service, requestId, userId); log **redaction** of secrets/PII.
   - .env.example (root + backend) with ONLY keys in use (no noise).

3) FRONTEND (web)
   - CRA→**Vite** (if needed): vite.config.ts + aliases; index.html with CSP nonce wiring.
   - `src/context/AuthContext.{ts,tsx}` via Supabase; email verify flow; passkeys UI; signout everywhere.
   - “Ask Assistant” page; “Manage Billing” → Stripe Portal; success/cancel pages; error boundaries; **Sentry init**.
   - Abuse: Turnstile widget gate on signup/login.
   - SEO: robots.txt, sitemap.xml, `<meta>` tags; OpenGraph basics.
   - **CDN & image pipeline**: WebP/AVIF, responsive images, cache headers, domain allowlist.
   - Accessibility: a11y basics (landmarks, labels), focus traps; color contrast in UI tokens.

4) OPTIONAL SURFACE
   - admin/, mobile/: if not needed now → `/archive/*` with README + resurrection steps. Workspace excludes archived paths.

5) OBSERVABILITY & MONITORING
   - Sentry DSN wired (front/back) with releases; source maps uploaded.
   - **Synthetic monitor**: cron or Checkly hitting `/health` + key flow (login → simple view). Email alerts.
   - **status page**: Instatus/Statuspage link in footer.
   - **security.txt** (/.well-known/security.txt) + `contact@` alias + bug bounty stub.

6) GATEWAY & EDGE
   - Optional: lightweight **API Gateway** (Cloudflare Routes / Vercel rewrites) to unify ingress and apply rate/CORS at edge.

7) FILES & SECURITY
   - Uploads: **AV scan** (ClamAV/Cloudflare AV) before persisting to Storage.
   - Request/response **size caps** and **ETag/If-Match** on mutable resources.

8) CI/CD
   - Replace `.github/workflows/deploy.yml`: pnpm cache → lint → typecheck → unit → **Playwright smoke** (can be skipped on forks) → deploy (Vercel web; backend to Cloud Run ONLY if needed).
   - **Lighthouse CI** step (PWA + CWV smoke) + **axe** accessibility check (fail on severe issues).

COMMANDS:
- Supabase: init, RLS policies, email verify ON, optional pgvector.
- Vercel: link, envs (public/private), image domains; deploy.
- Stripe: products/prices; webhook secret; **Customer Portal** enabled; **Stripe Tax** region settings.
- Email: Postmark/SendGrid API keys; DNS (SPF/DKIM/DMARC) checklist.
- Cloudflare: Turnstile site/secret; DNS; WAF basic rules.
- Sentry + OpenAI: keys set; test events; test completion.
- (Optional) Upstash/Redis for cache/rate.

LAUNCH CHECKLIST (sample 14):
- Signup/login, **email verify**, **passkeys** work; RLS enforced.
- CAPTCHA passes; rate-limits verified.
- Checkout → webhook persists subscription; **Portal** works; **VAT/Tax** configured.
- AI endpoint safe & logged (requestId); timeout honors.
- Sentry shows front/back errors; synthetic monitor green.
- CSP strict; cookies HttpOnly/SameSite; CORS exact.
- **OpenAPI** renders; GDPR export/delete present.
- SEO & images optimized; Lighthouse and axe pass thresholds.
- No dead packages/envs; archived modules isolated.
EOF

# --- v2: Clean, Automate, Harden
write_prompt "scale_and_enhance_v2.prompt" <<'EOF'
SYSTEM ROLE:
Lead Architect for nexus-platform. Evolve the v1 MVP into a scalable, feature-rich, and hardened v2 platform.

PRIMARY GOAL:
Enhance features, automate operations, and harden security to support initial user growth and prepare for team-based features.

REPO-WIDE ENHANCEMENT MANDATE:
- **Resurrect Admin Panel**: Bring back the `/admin` package from `/archive`. Rebuild it using a modern framework (e.g., Refine, Retool, or a custom Vite app with a component library) that connects to the backend API. It must be protected by admin-role-only authorization.
- **Introduce Team/Workspace Model**:
  - DB: Add `workspaces`, `workspace_members`, and `roles` tables. A user can belong to multiple workspaces with different roles (e.g., `owner`, `admin`, `member`).
  - RLS: Update all RLS policies to be workspace-aware. A user should only be able to see data within the workspaces they are a member of.
  - Backend: Refactor API endpoints to operate within the context of a `workspace_id`.
  - Frontend: Add UI for creating workspaces, inviting members, and switching between workspaces.
- **Advanced AI (RAG)**:
  - Implement a RAG (Retrieval-Augmented Generation) pipeline using Supabase `pgvector`.
  - Create a new service for embedding documents (on upload) and storing vectors.
  - Update the "Ask Assistant" endpoint to perform a vector similarity search and inject the context into the OpenAI prompt.
- **Automate & Standardize**:
  - **DB Migrations**: Move from `db:push` to a production-safe migration workflow (e.g., `supabase db diff` + `supabase migration new`). CI should check that migrations are valid.
  - **Dependency Management**: Add Renovate or Dependabot config to automate dependency updates with auto-merge for non-major versions.
  - **Testing**: Expand Playwright tests to cover all critical user flows (signup, create workspace, invite user, successful payment, RAG query).

V2 STACK UPGRADES:
- **Cache/Queues**: Integrate **Upstash Redis** for intelligent caching (e.g., user sessions, expensive queries) and as a queue for background jobs (e.g., report generation, bulk emails).
- **Backend Jobs**: Add a lightweight job processor (e.g., BullMQ) that works with Redis to handle asynchronous tasks.
- **Security Scanning**: Integrate **Snyk** or **GitHub Advanced Security** (CodeQL, dependency scanning) into the CI pipeline, failing builds on critical vulnerabilities.
- **Component Storybook**: Add Storybook to the `web` package to document and test UI components in isolation.

DELIVERABLES (produce ALL via unified diffs + commands):
1) **Admin Panel**:
   - Un-archive `admin` package, add to `pnpm-workspace.yaml`.
   - Create a new Vite-based project inside `/packages/admin`.
   - Implement login and a user management dashboard (list, view, edit roles).

2) **Workspace Model**:
   - New Supabase migration files for `workspaces`, `workspace_members`, `roles` tables.
   - Updated RLS policies for existing tables to be workspace-isolated.
   - Refactor backend services to require `workspace_id` and perform authorization checks.

3) **AI & RAG**:
   - Supabase migration to enable `pgvector` and create a table for storing embeddings.
   - New `/services/embedding.js` service that uses OpenAI's embedding API.
   - Modified `aiAgent.js` to perform vector search and augment prompts.

4) **CI/CD & Automation**:
   - `renovate.json` or `.github/dependabot.yml` configuration file.
   - New `test:e2e` CI job that runs the full Playwright suite against a preview environment.
   - New Storybook setup in `web` with sample stories for key components.

5) **Observability**:
   - Implement **distributed tracing**. Add OpenTelemetry to the backend and connect traces between the frontend (Sentry) and backend.
   - Create a Grafana dashboard (or use a managed service like Datadog/BetterStack) to visualize logs, metrics, and traces.

CHECKLIST:
- Can create a workspace and invite a new user via email.
- Invited user can accept and access the shared workspace.
- Data created in one workspace is not visible in another.
- Admin user can log into the `/admin` dashboard and see a list of all users.
- Uploading a document triggers the embedding process and stores a vector.
- The AI assistant's responses are now context-aware based on uploaded files.
- CI pipeline blocks PRs with failing E2E tests or critical security vulnerabilities.
EOF

# --- v3: Clean, Govern, Pro-Grade
write_prompt "ultra_enterprise_v3.prompt" <<'EOF'
SYSTEM ROLE:
Chief Architect for nexus-platform. Transform the v2 platform into a pro-grade, compliant, and highly available enterprise system.

PRIMARY GOAL:
Achieve enterprise readiness by implementing robust governance, security compliance (SOC 2), high availability, and advanced operational tooling.

REPO-WIDE UPGRADE MANDATE:
- **Compliance & Governance**:
  - **SOC 2 Prep**: Implement changes needed for SOC 2 Type 2 compliance. This includes a comprehensive, immutable audit trail for all significant events (logins, data access, settings changes, exports).
  - **SSO/SAML**: Integrate a SAML 2.0-based SSO provider (e.g., WorkOS, Okta) to allow enterprise customers to log in with their corporate identity.
  - **Advanced RBAC/ABAC**: Move beyond simple roles to a more granular permission system. Implement an Access Control List (ACL) or Attribute-Based Access Control (ABAC) model (e.g., using Oso or Casbin) to define fine-grained policies (e.g., "user can only edit documents they created").
- **High Availability & DR**:
  - **Multi-Region Strategy**: Develop a plan for multi-region deployment. This includes read-replicas for the Supabase database in different regions and a strategy for globally distributed storage.
  - **Database Backups & PITR**: Formalize the database backup strategy. Implement and test Point-In-Time-Recovery (PITR) procedures.
  - **Zero-Downtime Deployments**: Refine the CI/CD pipeline for the backend to support blue-green or canary deployments to ensure zero downtime.
- **Pro-Grade Operations**:
  - **Feature Flagging**: Integrate a feature flagging system (e.g., LaunchDarkly, Flagsmith) to de-risk releases and enable phased rollouts or A/B testing.
  - **API Versioning**: Introduce API versioning (e.g., `/api/v1/`, `/api/v2/`) to allow for breaking changes without impacting existing clients.
  - **Monorepo Tooling**: Migrate to a more powerful monorepo build tool like Turborepo or Nx to speed up CI/CD with remote caching.

V3 STACK & INFRASTRUCTURE:
- **Identity Provider**: **WorkOS** (for SSO/SAML/SCIM) or direct **Okta** integration.
- **Authorization Engine**: **Oso** or **Casbin** for managing complex authorization policies as code.
- **Feature Flags**: **Flagsmith** (open-source) or **LaunchDarkly**.
- **Infrastructure as Code (IaC)**: Begin defining managed resources (e.g., Cloudflare rules, Vercel projects) using **Terraform** or **Pulumi**.
- **Build System**: **Turborepo** for monorepo remote caching and optimized task running.

DELIVERABLES (produce ALL via unified diffs + commands):
1) **Governance & Auth**:
  - Add WorkOS SDK and create new routes for SSO callback handling.
  - Add Oso library to the backend and refactor a key service (e.g., document access) to use `oso.authorize()`. Define policies in `.polar` files.
  - Expand the audit log service to be more comprehensive and store events in a dedicated, append-only table.

2) **Infrastructure & DevOps**:
  - Add `pnpm add --global turbo` and create a `turbo.json` file defining the pipeline dependencies for `build`, `test`, `lint`.
  - Create a new `/infra` directory with a basic Terraform or Pulumi setup to manage a Cloudflare WAF rule.
  - Update `deploy.yml` to use `turbo run build` and implement a manual-approval step for production deployment.

3) **API & Feature Management**:
  - Add Flagsmith SDK to both frontend and backend. Wrap a new feature (e.g., a new UI element) in a feature flag.
  - Restructure the backend `routes` directory to be versioned, e.g., `/src/routes/v1/*.js`.

CHECKLIST:
- A user can initiate login from an external IdP (via SSO) and be successfully authenticated.
- A detailed audit log is created when a user changes another user's role in a workspace.
- Access to a specific resource is denied or allowed based on a policy defined in an Oso `.polar` file.
- The CI pipeline is visibly faster due to Turborepo's remote caching.
- A new feature is hidden by default and can be enabled for specific users/workspaces via a feature flag.
- The disaster recovery plan for the database is documented and has been tested in a staging environment.
EOF

# --- verification
echo
echo "✅ All prompts written successfully to $PROMPT_DIR/"
ls -1 "$PROMPT_DIR"
echo
echo "Line counts:"
wc -l "$PROMPT_DIR"/*.prompt
