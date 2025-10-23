#!/usr/bin/env node
// tools/v2_guardian.mjs — Definitive Solo Auditor/Doctor (Node ≥20, zero deps)
// Auto-detects runtime mode and audits accordingly:
//  - Serverless/Vercel mode: /api/*.js + vercel.json + public/
//  - Monolith mode (CHECK_MONOLITH=1 or server.express.js present): Express routes + web/public/ or public/
// Also validates modern tooling (pnpm, turbo, just, mise/direnv), env knobs, integrations,
// legal docs, push-capable marker, illegal-automation patterns, and optional platform checks.
//
// Run: node tools/v2_guardian.mjs
//
// Exit codes: 0 OK, 1 FAIL

import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const W = (p) => path.join(CWD, p);
const X = (p) => fs.existsSync(W(p));
const R = (p) => (X(p) ? fs.readFileSync(W(p), "utf8") : "");

let FAIL = 0, WARN = 0;
const ok = (m, d = "") => console.log("✅", m, d && `(${d})`);
const warn = (m, d = "") => { WARN++; console.log("⚠️ ", m, d && `(${d})`); };
const bad = (m, d = "") => { FAIL++; console.log("❌", m, d && `(${d})`); };

function must(p, label = p) { X(p) ? ok(`${label} present`) : bad(`${label} missing`, p); }
function mustAny(paths, label) {
  const found = paths.find((p) => X(p));
  if (found) ok(`${label} present`, found);
  else bad(`${label} missing`, paths.join(" | "));
}
function listFiles(dir, rx) {
  if (!X(dir)) return [];
  return fs.readdirSync(W(dir)).filter(f => rx.test(f));
}

// -------------------------------
// 0) Mode detection (serverless vs monolith)
// -------------------------------
const MONOLITH_FLAG = process.env.CHECK_MONOLITH === "1";
const MONOLITH_FILE = X("backend/src/server.express.js");
const MODE = (MONOLITH_FLAG || MONOLITH_FILE) ? "MONOLITH" : "SERVERLESS";
console.log(`# v2_guardian — MODE: ${MODE}\n`);

// -------------------------------
// 1) Modern tooling (always expected post-modernization)
// -------------------------------
[
  "pnpm-workspace.yaml",
  ".tool-versions",
  ".envrc",
  "justfile",
  "turbo.json",
  "package.json",
].forEach(p => must(p, p));
if (MODE === "SERVERLESS") {
  must("vercel.json", "vercel.json");
}

// -------------------------------
// 2) .env + integrations + windows/cost/retention
// -------------------------------
must("backend/.env.example", ".env.example");
if (X("backend/.env.example")) {
  const env = R("backend/.env.example");

  // Integrations should be enabled (=1)
  [
    "INTEGRATION_EXPRESS", "INTEGRATION_STRIPE", "INTEGRATION_SUPABASE",
    "INTEGRATION_OPENAI", "INTEGRATION_SENTRY", "INTEGRATION_TURNSTILE",
    "INTEGRATION_OPENAPI", "INTEGRATION_GDPR"
  ].forEach(k => {
    new RegExp(`^${k}\\s*=\\s*1`, "m").test(env)
      ? ok(`${k}=1`)
      : bad(`${k} not enabled (=1)`);
  });

  // Timing & cost rails
  /^(NIE_HOT_WINDOWS)\s*=.+/mi.test(env)
    ? ok("Hot windows configured", env.match(/^NIE_HOT_WINDOWS.*/mi)?.[0] || "")
    : bad("Hot windows NOT configured (set NIE_HOT_WINDOWS)");

  /^MAX_OUTBOUND_REQUESTS_PER_DAY\s*=\s*\d+/mi.test(env)
    ? ok("Cost rails present")
    : warn("Cost rails missing (set MAX_OUTBOUND_REQUESTS_PER_DAY)");

  /^RETENTION_DAYS\s*=\s*\d+/mi.test(env)
    ? ok("Retention knob present")
    : warn("Retention knob missing (set RETENTION_DAYS)");
} else {
  warn("No .env.example — skipped env checks");
}

// -------------------------------
// 3) API surface (mode-specific)
// -------------------------------
if (MODE === "SERVERLESS") {
  // /api handlers
  ["api/ai.js", "api/payments.js", "api/captcha.js", "api/openapi.js", "api/gov-health.js", "api/gdpr.js"]
    .forEach(p => must(p, p));

  // vercel.json sanity for routes (best-effort)
  if (X("vercel.json")) {
    try {
      const j = JSON.parse(R("vercel.json"));
      const routes = (j.routes || []).map(r => r.src);
      ["/api/ai", "/api/payments", "/api/captcha", "/api/openapi", "/api/gov-health", "/api/gdpr"].forEach(src => {
        routes.includes(src) ? ok(`vercel route ${src}`) : warn(`vercel route not mapped`, src);
      });
    } catch { warn("vercel.json invalid JSON"); }
  }
} else {
  // Monolith Express
  must("backend/src/server.express.js", "server.express.js");
  [
    "backend/src/routes/payments.js",
    "backend/src/routes/ai.js",
    "backend/src/routes/captcha.js",
    "backend/src/routes/openapi.js",
    "backend/src/routes/gdpr.js",
    "backend/src/routes/govHealth.js",
  ].forEach(p => must(p, p));
}

// -------------------------------
// 4) Adapters (common)
// -------------------------------
[
  "backend/src/integrations/stripe.mjs",
  "backend/src/integrations/openai.mjs",
  "backend/src/integrations/supabase.mjs",
  "backend/src/integrations/sentry.mjs",
  "backend/src/integrations/turnstile.mjs",
].forEach(p => must(p, p));

// -------------------------------
// 5) Legal & feature docs (paths normalized to root /public by default)
// -------------------------------
mustAny(["public/nie_disclaimer.txt", "web/public/nie_disclaimer.txt"], "legal disclaimer");
[
  "backend/src/features/nie-monitoring/README.md",
  "backend/src/features/eid/README.md",
  "backend/src/features/renewal/README.md",
].forEach(p => must(p, p));
must("policies/privacy.md", "privacy policy");
must("policies/acceptable-use.md", "acceptable use policy");

// -------------------------------
// 6) Push-capable marker
// -------------------------------
if (MODE === "SERVERLESS") {
  (X("public/manifest.json") || X("mobile"))
    ? ok("Push-capable channel present (PWA or mobile)")
    : warn("No push marker found (add public/manifest.json or mobile/)");
} else {
  (X("web/public/manifest.json") || X("public/manifest.json") || X("mobile"))
    ? ok("Push-capable channel present (PWA or mobile)")
    : warn("No push marker found (add web/public/manifest.json or public/manifest.json or mobile/)");
}

// -------------------------------
// 7) Illegal automation patterns (autobook/bypass/click-bots)
// -------------------------------
const suspects = [];
(function scan(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".next", "dist", "build", ".svelte-kit", ".turbo", ".vercel", ".output"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) scan(p);
    else if (/\.(m?js|ts|tsx|jsx)$/.test(p)) {
      const s = fs.readFileSync(p, "utf8");
      if (/auto[-_ ]?book/i.test(s)) suspects.push(p);
      if (/captcha.*bypass/i.test(s)) suspects.push(p);
      if (/(puppeteer|playwright)/i.test(s) && /click\s*\(/i.test(s)) suspects.push(p);
    }
  }
})(CWD);

suspects.length
  ? bad("Potential illegal automation patterns detected", suspects.slice(0, 6).map(x => path.relative(CWD, x)).join(", "))
  : ok("No auto-booking or CAPTCHA-bypass patterns detected");

// -------------------------------
// 8) OPTIONAL Platform checks (CHECK_PLATFORM=1)
// -------------------------------
if (process.env.CHECK_PLATFORM === "1") {
  console.log("\n# Optional platform checks enabled (CHECK_PLATFORM=1)");
  must("supabase/migrations", "Supabase migrations folder");
  mustAny(
    [".github/dependabot.yml", "renovate.json", ".renovaterc", ".renovaterc.json", ".renovaterc.js"],
    "Dependency automation config (Dependabot/Renovate)"
  );
  mustAny(["packages/admin", "apps/admin", "admin"], "Admin package/directory");
} else {
  console.log("\n# Optional platform checks skipped (set CHECK_PLATFORM=1 to enable)");
}

// -------------------------------
// 9) Summary
// -------------------------------
console.log(`\n# v2_guardian summary: ${FAIL ? `FAILS=${FAIL}` : "All mandatory checks passed"}${WARN ? ` | WARNS=${WARN}` : ""}`);
process.exit(FAIL ? 1 : 0);
