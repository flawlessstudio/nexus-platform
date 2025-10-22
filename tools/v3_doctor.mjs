#!/usr/bin/env node
// tools/v3_doctor.mjs — Doctor for v3 Guardian (Node >=20, zero deps)
// Validates denylist & pre-commit hook, governance knobs, policies/runbook,
// and (if CHECK_ENTERPRISE=1) CI workflows + ADR + logger.

import fs from "node:fs";
import path from "node:path";

const CWD=process.cwd(); const W=(p)=>path.join(CWD,p);
const X=(p)=>fs.existsSync(W(p)); const R=(p)=>(X(p)?fs.readFileSync(W(p),"utf8"):"");

let FAIL=0,WARN=0;
const ok=(m,d="")=>console.log("✅",m,d&&`(${d})`);
const warn=(m,d="")=>{WARN++;console.log("⚠️ ",m,d&&`(${d})`)};
const bad=(m,d="")=>{FAIL++;console.log("❌",m,d&&`(${d})`)};
const must=(p,l=p)=>X(p)?ok(`${l} present`):bad(`${l} missing`,p);

// 1) Denylist + pre-commit hook
must(".config/denylist.regex","denylist.regex");
must(".git/hooks/pre-commit","pre-commit hook");

// 2) Governance knobs (budget/windows)
must(".config/budget.json","budget.json");
if (X(".config/budget.json")){
  try {
    const j = JSON.parse(R(".config/budget.json"));
    typeof j.dailyRequestsMax==="number" ? ok("budget.dailyRequestsMax") : bad("budget.dailyRequestsMax missing");
    typeof j.backoffMs==="number" ? ok("budget.backoffMs") : bad("budget.backoffMs missing");
    typeof j.retryLimit==="number" ? ok("budget.retryLimit") : bad("budget.retryLimit missing");
  } catch { bad("budget.json invalid JSON"); }
}
must(".config/windows.yaml","windows.yaml");

// 3) Policies & runbook
must("policies/LEGAL.md","LEGAL.md");
must("policies/SECURITY.md","SECURITY.md");
must("docs/RUNBOOK_NIE_EID_RENEWAL.md","Runbook NIE/EID/Renewal");

// 4) Enterprise add-ons (if enabled)
if (process.env.CHECK_ENTERPRISE==="1"){
  console.log("\n# Enterprise checks ON");
  // Workflows
  must(".github/workflows/opa_policy.yml","OPA/Conftest workflow");
  must(".github/workflows/infracost.yml","Infracost workflow");
  must(".github/workflows/security.yml","Security (SBOM/Trivy/Dependabot) workflow");
  // ADR + logger
  must("docs/adr/ADR_0001_AI_LOGGER_OBSERVABILITY.md","ADR_0001 AI logger/observability");
  must("backend/src/utils/logger.mjs","logger.mjs");
} else {
  console.log("\n# Enterprise checks OFF (set CHECK_ENTERPRISE=1 to validate CI/ADR/logger)");
}

// 5) Quick denylist probe (ensure patterns exist)
if (X(".config/denylist.regex")){
  const txt = R(".config/denylist.regex");
  /auto[-_ ]?book/i.test(txt) ? ok("deny: autobook") : warn("denylist missing 'autobook' pattern");
  /captcha.*bypass/i.test(txt) ? ok("deny: captcha bypass") : warn("denylist missing 'captcha bypass' pattern");
  /headless.*click\(/i.test(txt) ? ok("deny: headless click") : warn("denylist missing 'headless click' pattern");
}

// 6) Summary
console.log(`\n# v3 doctor summary: ${FAIL?`FAILS=${FAIL}`:"OK"}${WARN?` | WARNS=${WARN}`:""}`);
process.exit(FAIL?1:0);
