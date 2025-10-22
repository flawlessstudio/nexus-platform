#!/usr/bin/env node
// tools/v2_guardian.mjs — Solo Auditor/Doctor (Node ≥20, zero deps)
// Verifies structure, env flags, routes, adapters, legal docs, push marker,
// illegal automation patterns — plus OPTIONAL platform checks
// (Supabase migrations, Dependabot/Renovate, Admin package) when CHECK_PLATFORM=1.
//
// Run: node tools/v2_guardian.mjs

import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const W = (p) => path.join(CWD, p);
const X = (p) => fs.existsSync(W(p));
const R = (p) => (X(p) ? fs.readFileSync(W(p), "utf8") : "");

let FAIL = 0, WARN = 0;
const ok   = (m, d = "") => console.log("✅", m, d && `(${d})`);
const warn = (m, d = "") => { WARN++; console.log("⚠️ ", m, d && `(${d})`); };
const bad  = (m, d = "") => { FAIL++; console.log("❌", m, d && `(${d})`); };

function must(p, label = p) { X(p) ? ok(`${label} present`) : bad(`${label} missing`, p); }
function mustAny(paths, label) {
  const found = paths.find((p) => X(p));
  if (found) ok(`${label} present`, found);
  else bad(`${label} missing`, paths.join(" | "));
}

// 1) .env + integration flags + hot windows / budget / retention
must("backend/.env.example", ".env.example");
if (X("backend/.env.example")) {
  const env = R("backend/.env.example");

  // integrations ON by default
  [
    "INTEGRATION_EXPRESS","INTEGRATION_STRIPE","INTEGRATION_SUPABASE",
    "INTEGRATION_OPENAI","INTEGRATION_SENTRY","INTEGRATION_TURNSTILE",
    "INTEGRATION_OPENAPI","INTEGRATION_GDPR"
  ].forEach(k => {
    new RegExp(`${k}\\s*=\\s*1`).test(env)
      ? ok(`${k}=1`)
      : bad(`${k} not enabled (=1)`);
  });

  // timing & cost controls
  /NIE_HOT_WINDOWS\s*=.+/i.test(env)
    ? ok("Hot windows configured", env.match(/NIE_HOT_WINDOWS.*/i)?.[0] || "")
    : bad("Hot windows NOT configured (set NIE_HOT_WINDOWS)");

  /MAX_OUTBOUND_REQUESTS_PER_DAY\s*=\s*\d+/i.test(env)
    ? ok("Cost rails present")
    : warn("Cost rails missing (set MAX_OUTBOUND_REQUESTS_PER_DAY)");

  /RETENTION_DAYS\s*=\s*\d+/i.test(env)
    ? ok("Retention knob present")
    : warn("Retention knob missing (set RETENTION_DAYS)");
} else {
  warn("No .env.example — skipped env-based checks");
}

// 2) Express server and core routes
must("backend/src/server.express.js", "server.express.js");
[
  "backend/src/routes/payments.js",
  "backend/src/routes/ai.js",
  "backend/src/routes/captcha.js",
  "backend/src/routes/openapi.js",
  "backend/src/routes/gdpr.js",
  "backend/src/routes/govHealth.js"
].forEach(p => must(p, p));

// 3) Adapters (graceful no-ops if libs not installed)
[
  "backend/src/integrations/stripe.mjs",
  "backend/src/integrations/openai.mjs",
  "backend/src/integrations/supabase.mjs",
  "backend/src/integrations/sentry.mjs",
  "backend/src/integrations/turnstile.mjs",
].forEach(p => must(p, p));

// 4) Legal & feature docs
must("web/public/nie_disclaimer.txt", "legal disclaimer");
[
  "backend/src/features/nie-monitoring/README.md",
  "backend/src/features/eid/README.md",
  "backend/src/features/renewal/README.md",
].forEach(p => must(p, p));
must("policies/privacy.md", "privacy policy");
must("policies/acceptable-use.md", "acceptable use policy");

// 5) Push capability marker (mobile app or PWA manifest)
(X("mobile") || X("web/public/manifest.json"))
  ? ok("Push-capable channel present (mobile or PWA)")
  : warn("No push marker found (add mobile app or web/public/manifest.json)");

// 6) Illegal automation pattern scan (auto-booking / CAPTCHA bypass / click-bots)
const suspects = [];
(function scan(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules",".git",".next","dist","build",".svelte-kit",".turbo"].includes(ent.name)) continue;
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

// 7) OPTIONAL Platform checks (only if CHECK_PLATFORM=1)
if (process.env.CHECK_PLATFORM === "1") {
  console.log("\n# Optional platform checks enabled (CHECK_PLATFORM=1)");

  // 7.1 Supabase migrations folder
  must("supabase/migrations", "Supabase migrations folder");

  // 7.2 Dependabot or Renovate config (any is fine)
  mustAny(
    [".github/dependabot.yml", "renovate.json", ".renovaterc", ".renovaterc.json", ".renovaterc.js"],
    "Dependency automation config (Dependabot/Renovate)"
  );

  // 7.3 Admin package presence (monorepo style)
  mustAny(
    ["packages/admin", "apps/admin", "admin"],
    "Admin package/directory"
  );
} else {
  console.log("\n# Optional platform checks skipped (set CHECK_PLATFORM=1 to enable)");
}

// 8) Summary and exit code
console.log(`\n# v2 summary: ${FAIL ? `FAILS=${FAIL}` : "All mandatory checks passed"}${WARN ? ` | WARNS=${WARN}` : ""}`);
process.exit(FAIL ? 1 : 0);
