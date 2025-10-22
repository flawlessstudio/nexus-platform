#!/usr/bin/env node
// tools/v2_doctor.mjs — Doctor for v2 Guardian (Node >=20, zero deps)
// Validates that v2_guardian coverage is coherent: flags, core checks, optional platform checks,
// push marker, illegal-automation scan, and policy files.

import fs from "node:fs";
import path from "node:path";

const CWD=process.cwd(); const W=(p)=>path.join(CWD,p);
const X=(p)=>fs.existsSync(W(p)); const R=(p)=>(X(p)?fs.readFileSync(W(p),"utf8"):"");

let FAIL=0,WARN=0;
const ok=(m,d="")=>console.log("✅",m,d&&`(${d})`);
const warn=(m,d="")=>{WARN++;console.log("⚠️ ",m,d&&`(${d})`)};
const bad=(m,d="")=>{FAIL++;console.log("❌",m,d&&`(${d})`)};
const must=(p,l=p)=>X(p)?ok(`${l} present`):bad(`${l} missing`,p);

// 1) v2 presence + .env knobs (mirror of v2_guardian expectations)
must("tools/v2_guardian.mjs","v2_guardian.mjs");
must("backend/.env.example",".env.example");
if (X("backend/.env.example")){
  const env = R("backend/.env.example");
  ["INTEGRATION_EXPRESS","INTEGRATION_STRIPE","INTEGRATION_SUPABASE","INTEGRATION_OPENAI","INTEGRATION_SENTRY","INTEGRATION_TURNSTILE","INTEGRATION_OPENAPI","INTEGRATION_GDPR"]
    .forEach(k=> new RegExp(`${k}\\s*=\\s*1`).test(env)?ok(`${k}=1`):bad(`${k} not enabled`));
  /NIE_HOT_WINDOWS\s*=.+/i.test(env)?ok("Hot windows configured"):bad("Hot windows missing");
  /MAX_OUTBOUND_REQUESTS_PER_DAY\s*=\s*\d+/i.test(env)?ok("Cost rails present"):warn("Cost rails missing");
  /RETENTION_DAYS\s*=\s*\d+/i.test(env)?ok("Retention knob present"):warn("Retention knob missing");
} else warn("Skipped env checks — .env.example not found");

// 2) Server & routes & adapters (same surface v2 audits)
must("backend/src/server.express.js","server.express.js");
[
  "backend/src/routes/payments.js",
  "backend/src/routes/ai.js",
  "backend/src/routes/captcha.js",
  "backend/src/routes/openapi.js",
  "backend/src/routes/gdpr.js",
  "backend/src/routes/govHealth.js"
].forEach(p=>must(p,p));
[
  "backend/src/integrations/stripe.mjs",
  "backend/src/integrations/openai.mjs",
  "backend/src/integrations/supabase.mjs",
  "backend/src/integrations/sentry.mjs",
  "backend/src/integrations/turnstile.mjs",
].forEach(p=>must(p,p));

// 3) Legal & features
must("web/public/nie_disclaimer.txt","legal disclaimer");
[
  "backend/src/features/nie-monitoring/README.md",
  "backend/src/features/eid/README.md",
  "backend/src/features/renewal/README.md",
].forEach(p=>must(p,p));
must("policies/privacy.md","privacy policy");
must("policies/acceptable-use.md","acceptable use policy");

// 4) Push marker (mobile or PWA)
(X("mobile")||X("web/public/manifest.json")) ? ok("Push-capable marker present") : warn("No push marker (mobile or manifest.json)");

// 5) Optional platform checks (if CHECK_PLATFORM=1)
if (process.env.CHECK_PLATFORM==="1"){
  console.log("\n# Optional platform checks ON");
  X("supabase/migrations") ? ok("Supabase migrations folder") : bad("Supabase migrations missing");
  (X(".github/dependabot.yml")||X("renovate.json")||X(".renovaterc")||X(".renovaterc.json")||X(".renovaterc.js"))
    ? ok("Dependabot/Renovate config present") : warn("No dependency automation config");
  (X("packages/admin")||X("apps/admin")||X("admin")) ? ok("Admin package/dir present") : warn("Admin package not found");
} else {
  console.log("\n# Optional platform checks OFF (set CHECK_PLATFORM=1 to enable)");
}

// 6) Illegal-automation patterns (autobook/bypass/click-bots)
const suspects=[];
(function scan(dir){
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if (["node_modules",".git",".next","dist","build",".svelte-kit",".turbo"].includes(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if (ent.isDirectory()) scan(p);
    else if (/\.(m?js|ts|tsx|jsx)$/.test(p)){
      const s=fs.readFileSync(p,"utf8");
      if (/auto[-_ ]?book/i.test(s)) suspects.push(p);
      if (/captcha.*bypass/i.test(s)) suspects.push(p);
      if (/(puppeteer|playwright)/i.test(s) && /click\s*\(/i.test(s)) suspects.push(p);
    }
  }
})(CWD);
suspects.length ? bad("Illegal automation patterns detected", suspects.slice(0,6).map(x=>path.relative(CWD,x)).join(", "))
               : ok("No autobooking/CAPTCHA-bypass patterns found");

// 7) Summary
console.log(`\n# v2 doctor summary: ${FAIL?`FAILS=${FAIL}`:"OK"}${WARN?` | WARNS=${WARN}`:""}`);
process.exit(FAIL?1:0);
