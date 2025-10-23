#!/usr/bin/env node
// tools/v3_doctor.mjs — Definitive Doctor for v3 (Node ≥20, zero deps)
// Validates: denylist/hook, budget & windows knobs, legal/security policies, runbook.
// If CHECK_ENTERPRISE=1: also validates CI workflows, Dependabot config, ADR, logger, and logs dir.
//
// Exit: 0 OK, 1 FAIL

import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const W = (p) => path.join(CWD, p);
const X = (p) => fs.existsSync(W(p));
const R = (p) => (X(p) ? fs.readFileSync(W(p), "utf8") : "");

let FAIL = 0, WARN = 0;
const ok   = (m) => console.log("✅", m);
const warn = (m) => { WARN++; console.log("⚠️ ", m); };
const bad  = (m) => { FAIL++; console.log("❌", m); };
const must = (p, label = p) => X(p) ? ok(`${label} present`) : bad(`${label} missing`);

// 1) Hard rails
must(".config/denylist.regex", "denylist.regex");
must(".git/hooks/pre-commit", "pre-commit hook");

// Validate denylist content (defense-in-depth)
if (X(".config/denylist.regex")) {
  const t = R(".config/denylist.regex");
  /auto[-_ ]?book/i.test(t) ? ok("denylist includes 'autobook'") : warn("denylist missing 'autobook' pattern");
  /captcha.*bypass/i.test(t) ? ok("denylist includes 'captcha bypass'") : warn("denylist missing 'captcha bypass' pattern");
  /headless.*click\(/i.test(t) ? ok("denylist includes 'headless click(')") : warn("denylist missing 'headless click(' pattern");
}

// 2) Knobs
must(".config/budget.json", "budget.json");
if (X(".config/budget.json")) {
  try {
    const j = JSON.parse(R(".config/budget.json"));
    typeof j.dailyRequestsMax === "number" ? ok("budget.dailyRequestsMax") : bad("budget.dailyRequestsMax missing");
    typeof j.backoffMs === "number" ? ok("budget.backoffMs") : bad("budget.backoffMs missing");
    typeof j.retryLimit === "number" ? ok("budget.retryLimit") : bad("budget.retryLimit missing");
  } catch {
    bad("budget.json invalid JSON");
  }
}
must(".config/windows.yaml", "windows.yaml");

// 3) Policies & Runbook
must("policies/LEGAL.md", "LEGAL.md");
must("policies/SECURITY.md", "SECURITY.md");
must("docs/RUNBOOK_NIE_EID_RENEWAL.md", "Runbook NIE/EID/Renewal");

// 4) Enterprise validations (optional)
if (process.env.CHECK_ENTERPRISE === "1") {
  console.log("\n# Enterprise checks ON");

  // Workflows
  must(".github/workflows/opa_policy.yml", "OPA/Conftest workflow");
  must(".github/workflows/infracost.yml", "Infracost workflow");
  must(".github/workflows/security.yml", "Security workflow");

  // Dependabot config (actual updater, not just fetch-metadata step)
  must(".github/dependabot.yml", "Dependabot configuration");

  // ADR & Logger
  must("docs/adr/ADR_0001_AI_LOGGER_OBSERVABILITY.md", "ADR_0001");
  must("backend/src/utils/logger.mjs", "logger.mjs");

  // logs dir presence (so logger has a target)
  if (X("logs")) {
    ok("logs/ directory present");
  } else {
    warn("logs/ directory missing (logger will create file append attempts; create logs/ for safety)");
  }
} else {
  console.log("\n# Enterprise checks OFF (set CHECK_ENTERPRISE=1 to validate CI/Dependabot/ADR/logger)");
}

// 5) Summary
console.log(`\n# v3 doctor summary: ${FAIL ? `FAILS=${FAIL}` : "OK"}${WARN ? ` | WARNS=${WARN}` : ""}`);
process.exit(FAIL ? 1 : 0);
