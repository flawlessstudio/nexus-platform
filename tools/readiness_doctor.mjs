#!/usr/bin/env node
/**
 * tools/readiness_doctor.mjs — Nexus Platform Readiness Doctor (refactored)
 * Node >= 20, ESM. Run at repo root.
 *
 * Capabilities:
 *  - Audits Zod env schema and local .env files; flags missing keys
 *  - Detects providers (Supabase, Stripe, Turnstile, Sentry, OpenAI, Vercel, GCP)
 *  - Security/DX checks (helmet/CSP, cookie-parser, rate-limit, CRA vs Vite, CI workflows, raw SQL, JWT in localStorage)
 *  - Produces Markdown guide (deep step-by-step) + JSON report
 *  - Risk scoring & prioritized actions
 *  - CI mode: exit non-zero on critical (or high+critical with --strict)
 *  - --open: auto-open report (Windows: start, macOS: open, Linux: xdg-open)
 *
 * Extra flags:
 *   --md-out <path>         Markdown output path (default: docs/reports/READINESS_GUIDE_<ts>.md)
 *   --json-out <path>       JSON output path    (default: docs/reports/READINESS_GUIDE_<ts>.json)
 *   --ci                    CI mode: non-zero exit on critical (or high+critical with --strict)
 *   --strict                CI mode treats 'high' as failing too
 *   --open                  Auto-open MD report (platform-aware)
 *   --all-playbooks         Include ALL provider playbooks, even if not detected
 *   --env-paths "<list>"    Comma-separated env file paths to scan (default: ".env,backend/.env,web/.env,admin/.env,mobile/.env")
 *   --gen-env-example       Generate backend/.env.example from Zod schema
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";

/* -------------------------------------------------------------------------- */
/* Args/Flags                                                                 */
/* -------------------------------------------------------------------------- */
const CWD = process.cwd();
const NOW = new Date();
const pad = (n) => String(n).padStart(2, "0");
const TS = `${NOW.getFullYear()}${pad(NOW.getMonth() + 1)}${pad(NOW.getDate())}_${pad(NOW.getHours())}${pad(NOW.getMinutes())}${pad(NOW.getSeconds())}`;

const { values: ARGS } = parseArgs({
  options: {
    "md-out": { type: "string" },
    "json-out": { type: "string" },
    ci: { type: "boolean" },
    strict: { type: "boolean" },
    open: { type: "boolean" },
    "all-playbooks": { type: "boolean" },
    "env-paths": { type: "string" },
    "gen-env-example": { type: "boolean" },
  },
  allowPositionals: true,
});

const OPEN = ARGS.open || false;
const CI_MODE = ARGS.ci || false;
const STRICT = ARGS.strict || false;
const ALL_PLAYBOOKS = ARGS["all-playbooks"] || false;
const GEN_ENV_EXAMPLE = ARGS["gen-env-example"] || false;

const MD_OUT = ARGS["md-out"] || `docs/reports/READINESS_GUIDE_${TS}.md`;
const JSON_OUT = ARGS["json-out"] || `docs/reports/READINESS_GUIDE_${TS}.json`;
const ENV_PATHS = (ARGS["env-paths"] || ".env,backend/.env,web/.env,admin/.env,mobile/.env")
  .split(",").map((s) => s.trim()).filter(Boolean);

/* -------------------------------------------------------------------------- */
/* FS helpers (cached)                                                        */
/* -------------------------------------------------------------------------- */
const abs = (rel) => path.join(CWD, rel);
const cache = new Map(); // key: rel path, val: string or null
const exists = (rel) => {
  try { return fs.existsSync(abs(rel)); } catch { return false; }
};
const readText = (rel) => {
  if (cache.has(rel)) return cache.get(rel);
  let val = null;
  try {
    if (exists(rel)) val = fs.readFileSync(abs(rel), "utf8");
  } catch { val = null; }
  cache.set(rel, val);
  return val;
};
const readJSON = (rel) => {
  const txt = readText(rel);
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return null; }
};
const ensureDirFor = (rel) => fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });

/* -------------------------------------------------------------------------- */
/* Scanners                                                                   */
/* -------------------------------------------------------------------------- */
const listFiles = (startRel) => {
  const startAbs = abs(startRel);
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (["node_modules",".git","dist","build",".next",".svelte-kit",".expo"].includes(ent.name)) continue;
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else out.push(path.relative(CWD, p));
    }
  })(startAbs);
  return out;
};

const findFirst = (...candidates) => {
  for (const c of candidates) if (exists(c)) return c;
  return null;
};

const parseEnvLines = (text) => {
  const out = {};
  (text || "").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  });
  return out;
};

/* -------------------------------------------------------------------------- */
/* Audits                                                                     */
/* -------------------------------------------------------------------------- */
function auditEnvSchema() {
  const file = findFirst("backend/src/utils/env.ts", "backend/src/utils/env.js");
  if (!file) return { file: null, keys: [], ok: false, error: "Env schema not found" };
  const src = readText(file) || "";
  const objMatch = src.match(/z\.object\s*\(\s*\{([\s\S]*?)\}\s*\)/m);
  if (!objMatch) return { file, keys: [], ok: false, error: "Could not parse z.object({ ... })" };

  const keys = [];
  const keyRegex = /([A-Z0-9_]+)\s*:\s*z\./g;
  let m;
  while ((m = keyRegex.exec(objMatch[1])) !== null) keys.push(m[1]);
  return { file, keys: [...new Set(keys)], ok: true };
}

function auditEnvPresence(envKeys) {
  const files = {};
  for (const p of ENV_PATHS) {
    if (exists(p)) files[p] = readText(p) || "";
  }
  const merged = {};
  Object.values(files).forEach((txt) => Object.assign(merged, parseEnvLines(txt)));
  const missing = envKeys.filter((k) => !(k in merged));
  return { files, merged, missing };
}

function auditProviders() {
  const providers = new Set();
  const pkgs = ["package.json","backend/package.json","web/package.json","admin/package.json","mobile/package.json"]
    .map(readJSON).filter(Boolean);

  const depText = pkgs.map((pkg) => JSON.stringify({ ...(pkg.dependencies||{}), ...(pkg.devDependencies||{}) })).join(" ");

  if (/supabase/i.test(depText) || /SUPABASE_/.test((readText("backend/.env.example")||"") + (readText("web/.env.example")||""))) providers.add("supabase");
  if (/stripe/i.test(depText) || /Stripe/.test((readText("backend/src/routes/payments.js")||"") + (readText("backend/src/routes/payments.ts")||""))) providers.add("stripe");
  if (/turnstile/i.test(depText) || /TURNSTILE_/.test((readText("backend/.env.example")||"") + (readText("backend/src/middleware/turnstile.js")||""))) providers.add("turnstile");
  if (/sentry/i.test(depText) || /SENTRY_DSN/.test((readText("backend/.env.example")||"") + (readText("web/.env.example")||""))) providers.add("sentry");
  if (/openai/i.test(depText) || /OPENAI_API_KEY/.test((readText("backend/.env.example")||"") + (readText("backend/src/services/aiAgent.js")||""))) providers.add("openai");
  if (exists(".vercel") || /vercel/i.test((readText(".github/workflows")||"") + (readText("docs/DEPLOYMENT-GUIDE.md")||""))) providers.add("vercel");
  if (exists("infra/main.tf") || /google/i.test(readText("infra/main.tf")||"")) providers.add("gcp");

  return providers;
}

function auditFrontendBuild() {
  const pkg = readJSON("web/package.json");
  const isCRA = !!(pkg?.dependencies?.["react-scripts"]);
  const isVite = exists("web/vite.config.ts") || exists("web/vite.config.js");
  return { isCRA, isVite };
}

function auditSecurityBackend() {
  const server = findFirst("backend/src/server.ts", "backend/src/server.js");
  const content = server ? (readText(server) || "") : "";
  return {
    server,
    hasHelmet: /helmet\(/.test(content),
    hasCSP: /contentSecurityPolicy/.test(content) || /csp/i.test(content),
    hasCookieParser: /cookieParser\(/.test(content),
    hasHealth: /\/health/.test(content),
    hasRequestId: /requestId/.test(content) || /x-request-id/i.test(content),
    hasRateLimit: exists("backend/src/middleware/rateLimit.js") || exists("backend/src/middleware/rateLimit.ts"),
  };
}

function auditWorkflows() {
  const dir = ".github/workflows";
  const list = exists(dir) ? fs.readdirSync(abs(dir)).filter((f) => /\.ya?ml$/.test(f)) : [];
  const set = new Set(list);
  return {
    list,
    hasTestDeploy: set.has("test-and-deploy.yml"),
    hasLeaks: set.has("leaks.yml"),
    hasPolicyCheck: set.has("policy-check.yml"),
    hasCostCheck: set.has("cost-check.yml"),
    hasSecurityGates: set.has("security-gates.yml"),
  };
}

function auditSmells() {
  const offendersSQL = [];
  const offendersJWT = [];
  for (const f of listFiles("backend/src/models")) {
    const s = readText(f) || "";
    if (/SELECT\s+.+FROM\s+/i.test(s)) offendersSQL.push(f);
  }
  for (const f of listFiles("web/src")) {
    const s = readText(f) || "";
    if (/localStorage\s*\.setItem\s*\(\s*['"]jwt/i.test(s)) offendersJWT.push(f);
  }
  return { offendersSQL, offendersJWT };
}

function auditDocs() {
  const missing = [];
  if (!exists("CHANGELOG.md")) missing.push("CHANGELOG.md");
  if (!exists("docs/MIGRATION_LOG.md")) missing.push("docs/MIGRATION_LOG.md");
  if (!exists("docs/ANALYTICS_SCHEMA.md")) missing.push("docs/ANALYTICS_SCHEMA.md");
  if (!exists("docs/runbooks/incident.md")) missing.push("docs/runbooks/incident.md");
  if (!exists("docs/runbooks/rollback.md")) missing.push("docs/runbooks/rollback.md");
  if (!exists("docs/adr")) missing.push("docs/adr/ (directory)");
  return { missing };
}

function auditArchiveCandidates() {
  const list = [];
  if (exists("admin") && !exists("admin/package.json")) list.push("admin/");
  if (exists("mobile") && !exists("mobile/package.json")) list.push("mobile/");
  return list;
}

function auditPackageManager() {
  const pkg = readJSON("package.json");
  if (!pkg) {
    return { ok: false, error: "root package.json not found" };
  }
  const pm = pkg.packageManager;
  if (!pm) {
    return { ok: false, error: "`packageManager` field is missing" };
  }
  if (!pm.startsWith("pnpm")) {
    return { ok: false, error: `Expected pnpm, but found '${pm}'` };
  }
  return { ok: true, value: pm };
}

function auditNvmrc() {
  const file = ".nvmrc";
  if (!exists(file)) {
    return { ok: false, error: "`.nvmrc` file is missing" };
  }
  const content = readText(file)?.trim();
  if (!content) {
    return { ok: false, error: "`.nvmrc` file is empty" };
  }
  return { ok: true, value: content };
}

function auditLicense() {
  const file = findFirst("LICENSE", "LICENSE.md", "LICENSE.txt");
  if (!file) {
    return { ok: false, error: "LICENSE file not found" };
  }
  return { ok: true, file };
}

function auditGitignore() {
  const file = ".gitignore";
  if (!exists(file)) {
    return { ok: false, error: "`.gitignore` file is missing" };
  }
  const content = readText(file) || "";
  const lines = content.split(/\r?\n/);

  const missing = [];
  if (!lines.some(line => /^\s*node_modules\/?\s*$/.test(line))) {
    missing.push("node_modules/");
  }
  if (!lines.some(line => /^\s*\.env\s*$/.test(line))) {
    missing.push(".env");
  }

  if (missing.length > 0) {
    return { ok: false, error: `File is missing required entries: ${missing.join(", ")}` };
  }

  return { ok: true, file };
}

function auditContributing() {
  const file = "CONTRIBUTING.md";
  if (!exists(file)) {
    return { ok: false, error: "`CONTRIBUTING.md` file not found" };
  }
  return { ok: true, file };
}

function auditReadme() {
  const file = "README.md";
  if (!exists(file)) {
    return { ok: false, errors: ["`README.md` file not found"] };
  }
  const content = readText(file) || "";
  const errors = [];

  if (content.length < 100) {
    errors.push("`README.md` is too short (less than 100 characters)");
  }

  const requiredSections = ["Getting Started", "Deployment", "License"];
  for (const section of requiredSections) {
    const regex = new RegExp(`^#+\\s*.*${section}`, "im");
    if (!regex.test(content)) {
      errors.push(`\`README.md\` is missing a '${section}' section`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, file, errors };
  }

  return { ok: true, file };
}

/* -------------------------------------------------------------------------- */
/* Risk model                                                                 */
/* -------------------------------------------------------------------------- */
const Severity = Object.freeze({ critical:"critical", high:"high", medium:"medium", low:"low", info:"info" });
const Weights = Object.freeze({ critical:10, high:6, medium:3, low:1, info:0 });

const risk = (severity, title, details="") => ({ severity, title, details });

function compileFindings(ctx) {
  const { envSchema, envPresence, providers, frontend, secBack, workflows, smells, docs, archive, pkgManager, nvmrc, license, gitignore, contributing, readme } = ctx;
  const items = [];

  if (!envSchema.file) items.push(risk(Severity.high, "Env schema missing", "Create backend/src/utils/env.(ts|js) with Zod."));
  else if (!envSchema.keys.length) items.push(risk(Severity.medium, "Env schema has no detectable keys", `Check z.object({}) in ${envSchema.file}.`));

  if (envPresence.missing.length)
    items.push(risk(Severity.critical, `Missing ENV keys: ${envPresence.missing.join(", ")}`, "Add to backend/.env and Vercel env (VITE_* for web)."));

  if (!secBack.server) items.push(risk(Severity.high, "backend/src/server.* not found", "Create server entry and add helmet/CSP/health/request-id."));
  else {
    if (!secBack.hasHelmet) items.push(risk(Severity.high, "helmet() not enabled", "Add helmet with strict CSP + nonce."));
    if (!secBack.hasCSP) items.push(risk(Severity.high, "CSP not enforced", "Use helmet({ contentSecurityPolicy: { useDefaults: true } })."));
    if (!secBack.hasCookieParser) items.push(risk(Severity.medium, "cookie-parser missing", "Use HttpOnly cookies for session/JWT."));
    if (!secBack.hasHealth) items.push(risk(Severity.low, "No /health endpoint", "Add /health for synthetic monitoring."));
    if (!secBack.hasRequestId) items.push(risk(Severity.medium, "No request-id propagation", "Add x-request-id middleware."));
    if (!secBack.hasRateLimit) items.push(risk(Severity.medium, "Rate limit middleware missing", "Create backend/src/middleware/rateLimit.(ts|js)."));
  }

  if (frontend.isCRA && !frontend.isVite) items.push(risk(Severity.medium, "CRA detected (consider Vite)", "Migrate web to Vite for DX & performance."));

  if (!workflows.hasTestDeploy) items.push(risk(Severity.high, "CI test-and-deploy.yml missing", "Add CI pipeline for test/build/deploy."));
  if (!workflows.hasLeaks) items.push(risk(Severity.high, "CI leaks.yml (gitleaks) missing", "Add secret leak scanning."));
  if (!workflows.hasSecurityGates) items.push(risk(Severity.high, "CI security-gates.yml missing", "Add SBOM + Trivy + dependency review."));
  if (!workflows.hasPolicyCheck) items.push(risk(Severity.medium, "CI policy-check.yml missing", "Add OPA/Conftest policy gates."));
  if (!workflows.hasCostCheck) items.push(risk(Severity.low, "CI cost-check.yml missing", "Add Infracost FinOps guard."));

  if (smells.offendersSQL.length) items.push(risk(Severity.high, "Raw SQL in backend/src/models", smells.offendersSQL.join("\n")));
  if (smells.offendersJWT.length) items.push(risk(Severity.high, "JWT stored in localStorage", smells.offendersJWT.join("\n")));

  if (docs.missing.length) items.push(risk(Severity.low, "Missing docs", docs.missing.join(", ")));

  if (pkgManager && !pkgManager.ok)
    items.push(risk(Severity.medium, "Root `package.json` `packageManager` is not set correctly", `Error: ${pkgManager.error}. This field ensures consistent dependency installation across environments.`));

  const pkg = readJSON("package.json");
  if (pkg && !pkg.author) {
    items.push(risk(Severity.medium, "Missing author in `package.json`", "Add an 'author' field to the root package.json to declare ownership."));
  }

  if (nvmrc && !nvmrc.ok)
    items.push(risk(Severity.low, "`.nvmrc` file is missing or empty", `Create a .nvmrc file in the root with the project's Node.js version (e.g., 20) to ensure consistent development environments.`));

  if (license && !license.ok) {
    items.push(risk(Severity.medium, "LICENSE file is missing or incomplete", `Error: ${license.error}. A standard license with a copyright notice is crucial for legal clarity.`));
  }

  if (gitignore && !gitignore.ok)
    items.push(risk(Severity.medium, "`.gitignore` is missing or incomplete", `Error: ${gitignore.error}. A robust .gitignore prevents committing secrets and build artifacts.`));

  if (contributing && !contributing.ok)
    items.push(risk(Severity.medium, "`CONTRIBUTING.md` is missing", `Error: ${contributing.error}. This file is important for guiding new contributors.`));

  if (readme && !readme.ok) {
    for (const error of readme.errors) {
      const isImportantSection = /Deployment|Getting Started|License/.test(error);
      if (isImportantSection) {
        const section = error.match(/'(.*?)'/)?.[1] || "important";
        items.push(risk(Severity.medium, `README.md is missing a '${section}' section`, `Error: ${error}. This section is important for project clarity and onboarding.`));
      } else {
        items.push(risk(Severity.low, "README.md is missing or insufficient", `Error: ${error}. A good README is essential for project onboarding.`));
      }
    }
  }

  if (archive.length) items.push(risk(Severity.info, "Archive candidates", archive.join(", ")));

  // Provider-specific env gaps (strong nudges)
  const have = (k) => Object.prototype.hasOwnProperty.call(envPresence.merged, k);
  if (providers.has("stripe") && (!have("STRIPE_KEY") || !have("STRIPE_WEBHOOK_SECRET")))
    items.push(risk(Severity.high, "Stripe detected but STRIPE_KEY/STRIPE_WEBHOOK_SECRET missing", "Add keys and configure webhook."));
  if (providers.has("supabase") && (!have("SUPABASE_URL") || !have("SUPABASE_ANON_KEY")))
    items.push(risk(Severity.high, "Supabase detected but SUPABASE_URL/ANON_KEY missing", "Add Supabase URL and anon key."));
  if (providers.has("turnstile") && !have("TURNSTILE_SECRET"))
    items.push(risk(Severity.medium, "Turnstile detected but TURNSTILE_SECRET missing", "Add Turnstile server secret."));
  if (providers.has("sentry") && !have("SENTRY_DSN"))
    items.push(risk(Severity.medium, "Sentry detected but SENTRY_DSN missing", "Add Sentry DSN."));
  if (providers.has("openai") && !have("OPENAI_API_KEY"))
    items.push(risk(Severity.medium, "OpenAI detected but OPENAI_API_KEY missing", "Add OpenAI API key."));

  const score = items.reduce((acc, r) => acc + (Weights[r.severity] || 0), 0);
  const criticals = items.filter((i) => i.severity === Severity.critical).length;
  const highs = items.filter((i) => i.severity === Severity.high).length;

  return { items, score, criticals, highs };
}

/* -------------------------------------------------------------------------- */
/* Generators                                                                 */
/* -------------------------------------------------------------------------- */
const ENV_DESCRIPTIONS = {
  SUPABASE_URL: "Supabase Project URL",
  SUPABASE_ANON_KEY: "Supabase Project Anon Key (public)",
  SUPABASE_SERVICE_KEY: "Supabase Service Role Key (secret, for backend admin tasks)",
  STRIPE_KEY: "Stripe Secret Key (sk_...)",
  STRIPE_WEBHOOK_SECRET: "Stripe Webhook Signing Secret (whsec_...)",
  OPENAI_API_KEY: "OpenAI API Key (sk_...)",
  SENTRY_DSN: "Sentry Data Source Name (DSN)",
  TURNSTILE_SECRET: "Cloudflare Turnstile Secret Key",
  NODE_ENV: "Node environment (development, test, production)",
};

function generateEnvExample(keys) {
  const lines = [`# Generated by readiness_doctor.mjs on ${NOW.toISOString()}`, ""];
  for (const key of keys) {
    if (ENV_DESCRIPTIONS[key]) lines.push(`# ${ENV_DESCRIPTIONS[key]}`);
    lines.push(`${key}=`, "");
  }
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Playbooks (detailed)                                                       */
/* -------------------------------------------------------------------------- */
const code = (lang, s) => `\`\`\`${lang}\n${s}\n\`\`\``;

const PLAYBOOKS = {
  supabase: (missing) => `### Supabase — Database, Auth, Storage
**Env needed:** \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`${(missing.has("SUPABASE_URL")||missing.has("SUPABASE_ANON_KEY"))?" — MISSING":""}

**Create & Configure**
1) New Project (region near users)
2) Auth: **Email Confirmation ON**, (optional) Passkeys (WebAuthn)
3) DB: **RLS ON**, (optional) enable **pgvector**
4) Storage: private bucket \`user-uploads\`
5) API keys: project **URL** + **anon** key

**Tables + RLS (example)**
${code("sql", `create table public.users (
  id uuid primary key default auth.uid(),
  email text unique not null,
  role text not null default 'user',
  created_at timestamptz default now()
);
alter table public.users enable row level security;
create policy "users can select self" on public.users for select using (auth.uid() = id);
create policy "users can update self" on public.users for update using (auth.uid() = id);`)}

**Env**
${code("powershell", `echo SUPABASE_URL=<url> >> backend/.env
echo SUPABASE_ANON_KEY=<anon> >> backend/.env
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY`)}

**CLI (optional)**
${code("powershell", `npm i -g supabase
supabase start
supabase status`)}

**Gotchas**
- Never use service_role in browser
- RLS on **every** table
`,
  stripe: (missing) => `### Stripe — Checkout, Webhooks, Portal, Tax
**Env needed:** \`STRIPE_KEY\`, \`STRIPE_WEBHOOK_SECRET\`${(missing.has("STRIPE_KEY")||missing.has("STRIPE_WEBHOOK_SECRET"))?" — MISSING":""}

**Dashboard**
- Create Product + recurring Price
- Enable Customer Portal (return URLs)
- Enable Stripe Tax if needed

**Backend Essentials**
- Checkout Sessions with idempotency key
- Webhook verification at \`/api/payments/webhook\`
- Customer Portal link endpoint

**Env**
${code("powershell", `echo STRIPE_KEY=sk_live_... >> backend/.env
# after stripe listen:
echo STRIPE_WEBHOOK_SECRET=whsec_... >> backend/.env`)}

**Dev Webhook (Windows)**
${code("powershell", `npm i -g stripe
stripe login
stripe listen --forward-to http://localhost:3000/api/payments/webhook`)}

**Test**
- Visa: 4242 4242 4242 4242 (any CVC, future expiry)

**Gotchas**
- Always verify webhook signatures
- Keep product/price IDs in config
`,
  turnstile: (missing) => `### Cloudflare Turnstile — CAPTCHA
**Env needed:** \`TURNSTILE_SECRET\`${missing.has("TURNSTILE_SECRET")?" — MISSING":""}

**Setup**
- Create Site (Managed) → copy site key + secret

**Client**
${code("html", `<div class="cf-turnstile" data-sitekey="<SITE_KEY>"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`)}

**Server verify**
${code("js", `export async function verifyTurnstile(token, secret) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ response: token, secret })
  });
  return !!(await res.json()).success;
}`)}

**Env**
${code("powershell", `echo TURNSTILE_SECRET=<secret> >> backend/.env`)}

**Gotchas**
- Always verify server-side on auth/AI/payment forms
`,
  sentry: (missing) => `### Sentry — Error Tracking & RUM
**Env needed:** \`SENTRY_DSN\`${missing.has("SENTRY_DSN")?" — MISSING":""}

**Backend (Express)**
${code("js", `import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
// ...routes...
app.use(Sentry.Handlers.errorHandler());`)}

**Frontend (Vite + React)**
${code("js", `import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});`)}

**Releases & Source Maps (CI)**
- Add SENTRY_AUTH_TOKEN
- Upload source maps
- Set release = commit SHA

**Env**
${code("powershell", `echo SENTRY_DSN=https://<dsn> >> backend/.env
vercel env add VITE_SENTRY_DSN`)}
`,
  openai: (missing) => `### OpenAI — AI Assistant
**Env needed:** \`OPENAI_API_KEY\`${missing.has("OPENAI_API_KEY")?" — MISSING":""}

**Backend (safe call)**
${code("js", `import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export async function aiDocumentAssistant(prompt){
  if(!prompt || prompt.length>2000) throw new Error("Invalid input");
  const res = await client.chat.completions.create({
    model:"gpt-4o-mini",
    messages:[{role:"user",content:prompt}],
    temperature:0.2,
    timeout:15000
  });
  return res.choices?.[0]?.message?.content ?? "";
}`)}

**Observability**
- Log requestId, tokens, latency, cost est.

**Env**
${code("powershell", `echo OPENAI_API_KEY=sk-... >> backend/.env`)}

**Gotchas**
- Never expose API key to client; use timeouts and token caps
`,
  vercel: () => `### Vercel — Hosting & Previews
**Link & Build**
${code("powershell", `npm i -g vercel
vercel link
# If web uses Vite:
# Build Command: pnpm -F web build
# Output Dir: web/dist`)}

**Env vars**
${code("powershell", `vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SENTRY_DSN
vercel env pull .env.local`)}

**Rewrites/Proxy**
- Use vercel.json to proxy /api/* to backend if needed

**Previews**
- Enable branch previews; set Preview envs
`,
  gcp: () => `### Google Cloud — Secret Manager, Cloud Run, GitHub OIDC

**Enable APIs**
${code("powershell", `gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com monitoring.googleapis.com`)}

**Secret Manager**
${code("powershell", `gcloud secrets create backend_env --replication-policy="automatic"
@"
STRIPE_KEY=...
STRIPE_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
SENTRY_DSN=...
"@ | Out-File -Encoding ascii secrets.txt
gcloud secrets versions add backend_env --data-file=secrets.txt
gcloud secrets describe backend_env`)}

**Cloud Run (containerized backend)**
${code("powershell", `gcloud artifacts repositories create nexus-repo --repository-format=docker --location=europe-west1
gcloud builds submit --tag europe-west1-docker.pkg.dev/<PROJECT_ID>/nexus-repo/backend:latest backend
gcloud run deploy nexus-backend --image europe-west1-docker.pkg.dev/<PROJECT_ID>/nexus-repo/backend:latest --region=europe-west1 --allow-unauthenticated`)}

**Mount secrets**
${code("powershell", `gcloud run services update nexus-backend --update-secrets=STRIPE_KEY=backend_env:latest,STRIPE_WEBHOOK_SECRET=backend_env:latest,OPENAI_API_KEY=backend_env:latest,SENTRY_DSN=backend_env:latest --region=europe-west1`)}

**GitHub OIDC**
- Create Workload Identity Federation pool/provider (GitHub)
- In workflow: permissions: id-token: write
- Bind roles to deploy SA
`,
  prisma: () => `### Prisma — Replace Raw SQL (Checklist)
${code("powershell", `pnpm add -F backend prisma @prisma/client -D
pnpm -F backend prisma init
# edit backend/prisma/schema.prisma
pnpm -F backend prisma migrate dev`)}

- Refactor repositories/services to use Prisma client
- Generate types in CI before build
`,
  vite: () => `### Vite — Migrate from CRA (Checklist)
${code("bash", `# in web/
pnpm add vite @vitejs/plugin-react -D
# add vite.config.ts with React plugin and aliases
# update package.json scripts (dev/build/preview)
# move HTML shell to web/index.html (type="module")`)}

- All web envs exposed to client must be prefixed with VITE_
`,
};

/* -------------------------------------------------------------------------- */
/* Renderer                                                                   */
/* -------------------------------------------------------------------------- */
const md = (sections) => sections.filter(Boolean).join("\n");

function renderMarkdown(ctx) {
  const {
    envSchema, envPresence, providers, frontend, secBack, workflows, smells, docs, archive, findings,
  } = ctx;

  const missingSet = new Set(envPresence.missing);
  const provList = ["supabase","stripe","turnstile","sentry","openai","vercel","gcp"];
  const always = ["prisma","vite"];

  const selected = ALL_PLAYBOOKS
    ? [...provList, ...always]
    : [...[...providers].filter((p) => provList.includes(p)), ...always];

  const playbookText = selected.map((p) => PLAYBOOKS[p](missingSet)).join("\n");

  return md([
    `# Nexus Platform — Readiness Doctor Report`,
    `_Generated: ${NOW.toISOString()}_`,
    ``,
    `## TL;DR`,
    `- Env schema: \`${envSchema.file ?? "NOT FOUND"}\``,
    `- Env keys: ${envSchema.keys.length ? envSchema.keys.join(", ") : "(none)"}`,
    `- Missing env keys: ${envPresence.missing.length ? envPresence.missing.join(", ") : "none"}`,
    `- Providers: ${providers.size ? Array.from(providers).join(", ") : "none"}`,
    `- Web build: ${frontend.isVite ? "Vite ✅" : frontend.isCRA ? "CRA (migrate) ⚠️" : "Unknown"}`,
    `- CI workflows: ${workflows.list.length ? workflows.list.join(", ") : "none"}`,
    `- Risk score: **${findings.score}** — critical: ${findings.criticals}, high: ${findings.highs}`,
    ``,
    `## Environment — What You Still Need`,
    !envSchema.file
      ? `- Env schema not found (\`backend/src/utils/env.(ts|js)\`). Add Zod object to validate env.`
      : envSchema.keys.length === 0
        ? `- Found \`${envSchema.file}\` but did not detect keys. Ensure \`z.object({ ... })\` is top-level.`
        : envPresence.missing.length === 0
          ? `- ✅ All env keys from schema are present in scanned .env files. Verify production secrets too.`
          : `- **Missing keys**:\n${envPresence.missing.map((k) => `  - \`${k}\``).join("\n")}\nAdd to \`backend/.env\` (and Vercel env with \`VITE_*\` for frontend).`,
    ``,
    `## Provider Playbooks (Step-by-Step, Copy-Paste Ready)`,
    playbookText,
    ``,
    `## Security/DX Checklist (Backend)`,
    `- helmet(): ${secBack.hasHelmet ? "✅" : "❌"}  ${secBack.hasHelmet ? "" : "(add helmet with strict CSP + nonce)"}`,
    `- CSP enforced: ${secBack.hasCSP ? "✅" : "❌"}`,
    `- cookie-parser: ${secBack.hasCookieParser ? "✅" : "❌"}`,
    `- /health endpoint: ${secBack.hasHealth ? "✅" : "❌"}`,
    `- request-id propagation: ${secBack.hasRequestId ? "✅" : "❌"}`,
    `- rate-limit middleware: ${secBack.hasRateLimit ? "✅" : "❌"}`,
    ``,
    `## Structural & Docs`,
    frontend.isCRA && !frontend.isVite ? "- ⚠️ CRA detected; migrate to Vite." : "",
    !workflows.list.length ? "- Add CI workflows in \`.github/workflows/\` (test-and-deploy, leaks, policy-check, cost-check, security-gates)." : "",
    docs.missing.length ? `- Missing docs: ${docs.missing.join(", ")}` : "",
    archive.length ? `- Consider archiving: ${archive.join(", ")}` : "",
    ``,
    `## Code Smells`,
    smells.offendersSQL.length ? `- Raw SQL in models:\n${smells.offendersSQL.map((f) => `  - ${f}`).join("\n")}` : "- ✅ No raw SQL detected.",
    smells.offendersJWT.length ? `- JWT in localStorage:\n${smells.offendersJWT.map((f) => `  - ${f}`).join("\n")}` : "- ✅ No JWT-in-localStorage usage found.",
    ``,
    `## CI/CD & Secrets — Commands to Run Next`,
    `**Vercel**:\n${code("powershell", `vercel link
vercel env pull .env.local
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SENTRY_DSN`)}

**Stripe (dev webhook)**
${code("powershell", `stripe listen --forward-to http://localhost:3000/api/payments/webhook`)}

**Supabase CLI**
${code("powershell", `supabase start
supabase status`)}

**GCP Secret Manager**
${code("powershell", `gcloud secrets create backend_env --replication-policy="automatic"
@"
STRIPE_KEY=...
STRIPE_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
SENTRY_DSN=...
"@ | Out-File -Encoding ascii secrets.txt
gcloud secrets versions add backend_env --data-file=secrets.txt
gcloud secrets describe backend_env`)}`,
    ``,
    `## Prioritized Action List`,
    ...["critical","high","medium","low","info"].flatMap((sev) => {
      const group = findings.items.filter((i) => i.severity === sev);
      return group.length
        ? [`\n### ${sev.toUpperCase()}`, ...group.map((g, i) => `- ${i+1}. **${g.title}**${g.details ? ` — ${g.details}` : ""}`)]
        : [];
    }),
    ``,
    `## Launch Gate (pass/fail quick check)`,
    `- [ ] All env vars present (local + Vercel + prod secrets)`,
    `- [ ] Sentry errors visible (front/back)`,
    `- [ ] CAPTCHA server verification works`,
    `- [ ] Stripe: checkout, webhook, portal, Tax/VAT configured`,
    `- [ ] Supabase: email verify ON, RLS ON, passkeys`,
    `- [ ] AI agent: limits, timeouts, requestId logging`,
    `- [ ] OpenAPI non-prod, GDPR stubs`,
    `- [ ] Lighthouse/axe thresholds pass`,
    `- [ ] CI pipelines green; main deploy gated`,
    `- [ ] No raw SQL; no JWT in localStorage; strict CSP; HttpOnly cookies`,
  ].filter(Boolean));
}

/* -------------------------------------------------------------------------- */
/* State + IO                                                                 */
/* -------------------------------------------------------------------------- */
function buildState() {
  const envSchema = auditEnvSchema();
  const envPresence = auditEnvPresence(envSchema.keys);
  const providers = auditProviders();
  const frontend = auditFrontendBuild();
  const secBack = auditSecurityBackend();
  const workflows = auditWorkflows();
  const smells = auditSmells();
  const docs = auditDocs();
  const archive = auditArchiveCandidates();
  const pkgManager = auditPackageManager();
  const nvmrc = auditNvmrc();
  const license = auditLicense();
  const gitignore = auditGitignore();
  const contributing = auditContributing();
  const readme = auditReadme();
  const findings = compileFindings({ envSchema, envPresence, providers, frontend, secBack, workflows, smells, docs, archive, pkgManager, nvmrc, license, gitignore, contributing, readme });

  return { envSchema, envPresence, providers, frontend, secBack, workflows, smells, docs, archive, pkgManager, nvmrc, license, gitignore, contributing, readme, findings, generatedAt: NOW.toISOString(), version: "refactor-1.0.0" };
}

function writeReports(md, json) {
  ensureDirFor(MD_OUT);
  ensureDirFor(JSON_OUT);
  fs.writeFileSync(abs(MD_OUT), md, "utf8");
  fs.writeFileSync(abs(JSON_OUT), JSON.stringify(json, null, 2), "utf8");
  console.log("✅ Readiness guide generated:");
  console.log("-", MD_OUT);
  console.log("-", JSON_OUT);
  console.log(`Risk score: ${json.findings.score} (critical: ${json.findings.criticals}, high: ${json.findings.highs})`);
}

function writeEnvExample(keys) {
  const content = generateEnvExample(keys);
  const target = "backend/.env.example";
  fs.writeFileSync(abs(target), content, "utf8");
  console.log(`✅ Generated ${target}`);
}

/* -------------------------------------------------------------------------- */
/* Open helper                                                                */
/* -------------------------------------------------------------------------- */
function openFile(filePath) {
  try {
    const full = abs(filePath);
    if (process.platform === "darwin") spawnSync("open", [full], { stdio: "ignore" });
    else if (process.platform === "win32") spawnSync("cmd", ["/c", "start", "", full], { stdio: "ignore", shell: true });
    else {
      const probe = spawnSync("which", ["xdg-open"], { encoding: "utf8" });
      if (probe.status === 0) spawnSync("xdg-open", [full], { stdio: "ignore" });
      else console.log("(info) xdg-open not available; open manually:", full);
    }
  } catch (e) {
    console.log("(warn) Failed to auto-open file:", e.message);
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */
(function main() {
  const state = buildState();
  const md = renderMarkdown(state);
  writeReports(md, state);
  if (GEN_ENV_EXAMPLE && state.envSchema.keys.length) writeEnvExample(state.envSchema.keys);
  if (OPEN) openFile(MD_OUT);

  if (CI_MODE) {
    const failOnCritical = state.findings.criticals > 0;
    const failOnHigh = STRICT && state.findings.highs > 0;
    if (failOnCritical || failOnHigh) {
      console.error(`❌ CI mode: failing due to ${failOnCritical ? "critical" : ""}${failOnCritical && failOnHigh ? " & " : ""}${failOnHigh ? "high" : ""} findings.`);
      process.exit(failOnCritical ? 2 : 1);
    }
  }
})();
