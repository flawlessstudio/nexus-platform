#!/usr/bin/env node
// tools/v1_doctor.mjs — Doctor for v1 Guardian (Node >=20, zero deps)
// Validates baseline scaffold, env keys, legal files, integrations & Express server.
// Dry by default; exits non-zero on critical issues (missing core pieces).

import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const W = (p) => path.join(CWD, p);
const X = (p) => fs.existsSync(W(p));
const R = (p) => (X(p) ? fs.readFileSync(W(p), "utf8") : "");

let FAIL = 0, WARN = 0;
const ok   = (m,d="")=>console.log("✅",m,d&&`(${d})`);
const warn = (m,d="")=>{WARN++;console.log("⚠️ ",m,d&&`(${d})`)};
const bad  = (m,d="")=>{FAIL++;console.log("❌",m,d&&`(${d})`)};
const must = (p,label=p)=>X(p)?ok(`${label} present`):bad(`${label} missing`,p);

function hasScript(name, expect){
  const pkg = JSON.parse(R("package.json")||"{}");
  const val = pkg?.scripts?.[name];
  return typeof val === "string" && (!expect || val.includes(expect));
}

// 1) Hygiene
must(".editorconfig",".editorconfig");
must(".gitattributes",".gitattributes");
must(".nvmrc",".nvmrc");

// 2) package.json scripts (dev/guard/audit/govern)
if (!X("package.json")) bad("package.json missing");
else {
  hasScript("dev","server.express.js") || hasScript("dev","server.js")
    ? ok("script: dev")
    : bad("script: dev missing or not pointing to backend server");
  hasScript("guard") ? ok("script: guard") : warn("script: guard not found");
  hasScript("audit") ? ok("script: audit") : warn("script: audit not found");
  hasScript("govern") ? ok("script: govern") : warn("script: govern not found");
}

// 3) Baseline folders
[
  "backend/src/routes",
  "backend/src/features/nie-monitoring",
  "backend/src/features/eid",
  "backend/src/features/renewal",
  "backend/src/utils",
  "policies",
  "docs/reports",
  "web/public/.well-known"
].forEach(p=>must(p,p));

// 4) Env example + critical knobs & integrations flags
must("backend/.env.example",".env.example");
if (X("backend/.env.example")){
  const env = R("backend/.env.example");
  const needKeys = [
    "NIE_HOT_WINDOWS","NIE_COLD_CHECK_MINUTES","NIE_JITTER_MS",
    "MAX_OUTBOUND_REQUESTS_PER_DAY","BACKOFF_MS","RETRY_LIMIT","RETENTION_DAYS",
    "INTEGRATION_EXPRESS","INTEGRATION_STRIPE","INTEGRATION_SUPABASE","INTEGRATION_OPENAI",
    "INTEGRATION_SENTRY","INTEGRATION_TURNSTILE","INTEGRATION_OPENAPI","INTEGRATION_GDPR"
  ];
  needKeys.forEach(k => new RegExp(`${k}\\s*=`).test(env) ? ok(`ENV ${k}`) : bad(`ENV ${k} missing`));

  // Optional provider secrets (warn if integrations are ON but keys look dummy/empty)
  const keyPairs = [
    ["INTEGRATION_STRIPE","STRIPE_KEY"],
    ["INTEGRATION_STRIPE","STRIPE_WEBHOOK_SECRET"],
    ["INTEGRATION_SUPABASE","SUPABASE_URL"],
    ["INTEGRATION_SUPABASE","SUPABASE_ANON_KEY"],
    ["INTEGRATION_OPENAI","OPENAI_API_KEY"],
    ["INTEGRATION_SENTRY","SENTRY_DSN"],
    ["INTEGRATION_TURNSTILE","TURNSTILE_SECRET"]
  ];
  for (const [flag,key] of keyPairs){
    const on = new RegExp(`${flag}\\s*=\\s*1`).test(env);
    const has = new RegExp(`${key}\\s*=`).test(env) && !/=\s*$/.test(env.match(new RegExp(`${key}\\s*=.*`))?.[0]||"");
    if (on && !has) warn(`Integration ON but ${key} not set`);
  }
} else warn("Cannot validate env knobs/integrations (no .env.example)");

// 5) Express server & routes (or fallback minimal server)
if (X("backend/src/server.express.js")) ok("Express server present"); else warn("Express server missing");
[
  "backend/src/routes/payments.js",
  "backend/src/routes/ai.js",
  "backend/src/routes/captcha.js",
  "backend/src/routes/openapi.js",
  "backend/src/routes/gdpr.js",
  "backend/src/routes/govHealth.js"
].forEach(p=>X(p)?ok(`${p}`):warn(`${p} missing`));

// 6) Integrations adapters
[
  "backend/src/integrations/stripe.mjs",
  "backend/src/integrations/openai.mjs",
  "backend/src/integrations/supabase.mjs",
  "backend/src/integrations/sentry.mjs",
  "backend/src/integrations/turnstile.mjs",
  "backend/src/utils/budget.js"
].forEach(p=>X(p)?ok(`${p}`):warn(`${p} missing`));

// 7) Feature READMEs + legal
must("backend/src/features/nie-monitoring/README.md","nie-monitoring README");
must("backend/src/features/eid/README.md","eid README");
must("backend/src/features/renewal/README.md","renewal README");
must("web/public/nie_disclaimer.txt","legal disclaimer");
must("policies/privacy.md","privacy policy");
must("policies/acceptable-use.md","acceptable-use policy");

// 8) Summary
console.log(`\n# v1 doctor summary: ${FAIL?`FAILS=${FAIL}`:"OK"}${WARN?` | WARNS=${WARN}`:""}`);
process.exit(FAIL?1:0);
