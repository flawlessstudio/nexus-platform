# 🧠 FINAL MASTER PROMPT — NEXUS PLATFORM MODERNIZATION

> SYSTEM ROLE:
> You are a senior DevOps + full-stack architect AI specialized in developer-experience optimization.
> Your mission is to modernize and refactor the entire Nexus Platform project to a state-of-the-art, world-class, solo-builder stack — maximizing performance, simplicity, and maintainability without breaking existing functionality.

---

## 🎯 OBJECTIVE

Upgrade the Nexus Platform repo (Node.js + serverless + integrations) to a modern, fast, and frictionless toolchain optimized for local + Vercel deployment.

---

## 🔧 REQUIRED MIGRATIONS

| Layer                  | Replace / Upgrade To            | Purpose                            |
| ---------------------- | ------------------------------- | ---------------------------------- |
| Package Manager        | `pnpm`                          | Faster installs, smaller footprint |
| Bundler                | `vite`                          | Instant dev server, native ESM     |
| Test Runner            | `vitest`                        | Drop-in Jest replacement, faster   |
| Monorepo Orchestration | `turborepo`                     | Caching + pipelines                |
| Python Env (if any)    | `uv`                            | Instant resolver + virtual env     |
| Task Runner            | `just`                          | Simple, fast Makefile alternative  |
| Version/Env Manager    | `mise` or `direnv`              | Auto env & runtime pinning         |
| E2E Testing            | `playwright`                    | Modern browser automation          |
| CI/CD                  | Minimal GitHub Actions + Vercel | Fast caching & reproducible builds |
| Formatter/Linter       | `biome` or `rome`               | Single binary, instant feedback    |
| Container / Infra      | `buildx` or `nixpacks`          | Fast, reproducible builds          |

---

## 🧩 TASKS TO PERFORM

1. Detect all languages, dependencies, and managers in the repo.
2. Replace old tools (`npm`, `pip`, `make`, etc.) with modern equivalents listed above.
3. Generate and update:

   - `pnpm-workspace.yaml`
   - `turbo.json`
   - `vite.config.ts` and `vitest.config.ts`
   - `.tool-versions` (mise/asdf)
   - `.env.example` and `.envrc`
   - `justfile` with tasks: `dev`, `build`, `test`, `deploy`, `doctor`, `guardians`
   - `.github/workflows/ci.yml` (modernized CI)
   - `vercel.json` optimized for serverless + edge runtime
   - `bootstrap.sh` to reinitialize from scratch
4. Refactor `package.json` scripts to use `pnpm run` or `just`.
5. Lock all dependencies (generate `pnpm-lock.yaml`, `.uv.lock`, etc.).
6. Preserve backend features and integrations (Supabase, OpenAI, Stripe, Turnstile, GDPR).
7. Maintain legal compliance hooks (`v1`, `v2`, `v3` guardians intact).
8. Optimize for cold-start speed and build performance.
9. Create `modernization_report.md` summarizing:

   - Tools replaced
   - Tools added
   - Config changes
   - Performance gains (estimated %)
   - Setup instructions
   - Verification checklist

---

## ⚙️ DELIVERABLES

- ✅ Updated configuration files (pnpm, vite, turbo, etc.)
- ✅ `justfile` task runner with clean commands
- ✅ `.tool-versions` and `.envrc` for mise/direnv
- ✅ Updated CI workflow (`.github/workflows/ci.yml`)
- ✅ Optimized `vercel.json`
- ✅ `modernization_report.md` (Markdown summary)
- ✅ `bootstrap.sh` (one-line project setup)
- ✅ All existing code and integrations remain functional

---

## 🚀 PERFORMANCE GOALS

- Cold start time: ≤ 1 s in dev
- Install time: 3× faster than npm
- Build time: 50–70 % reduction vs. old stack
- Zero manual setup: `mise install && just dev` should start everything
- Fully reproducible builds: lockfiles, no global deps

---

## 🧠 CONSTRAINTS

- Do not alter business logic or APIs.
- Keep zero global dependencies; all tools local or managed via mise.
- Maintain Vercel serverless compatibility (no port listeners).
- Use Node 20+ and ESM modules.
- Keep legal guardrails (denylist, pre-commit hooks, policies).
- Output final results as a structured diff + Markdown summary.

---

## 📜 OUTPUT REQUIREMENTS

Produce all modernized files and documentation in one output bundle:

```
modernization_report.md
pnpm-workspace.yaml
turbo.json
vite.config.ts
vitest.config.ts
.tool-versions
.env.example
.envrc
justfile
vercel.json
.github/workflows/ci.yml
.bootstrap.sh
```

Each file should be production-ready, syntactically valid, and optimized for Vercel deployment and local development.

---

## ⚡ BOOTSTRAP COMMAND

```bash
# Reinitialize modern Nexus Platform environment
mise install
pnpm install
pnpm dlx turbo prune
just setup && just dev
```

---

## 🧭 EXECUTION STRATEGY

- Detect current setup
- Propose modernization plan
- Apply all transformations
- Generate report + migration diff
- Validate with dry-run build and Vercel simulation
- Return ready-to-commit updated repo files

---

## ✅ POST-CHECKS

Before completing, confirm:

- All tests run via `vitest`.
- Vercel build completes without warnings.
- `pnpm install` resolves cleanly with lockfile.
- Guardians (v1–v3) still pass readiness checks.
- All new config files are committed and formatted.

---

## 💬 FOLLOW-UP COMMANDS (optional)

```
"Apply this modernization to the Nexus Platform repo now."
"Show me the diff for all replaced toolchains."
"Generate modernization_report.md with all migration details."
"Simulate the Vercel build using the new stack."
```

---

✅ Instruction to AI:
Execute this modernization plan fully and safely, preserving all business logic and app functionality, and output every changed file + a detailed `modernization_report.md`.
Ensure all new tooling (pnpm, vite, vitest, turbo, just, mise, uv, playwright) is configured and tested.

---

Paste this entire prompt into your AI workspace, then say:

> “Apply this modernization prompt to my Nexus Platform repo.”

Once it runs, you can commit the new configs directly to the `main` branch — you’ll be future-proofed, ultra-fast, and Vercel-ready.

