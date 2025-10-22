#!/usr/bin/env node
// tools/v3_guardian.mjs — Hybrid World-Class Governance (Solo + Enterprise)
// Node >= 20, zero runtime deps. Creates denylist & hooks, budget/windows knobs,
// legal/security/runbook docs, and (if CHECK_ENTERPRISE=1) enterprise CI workflows:
//  - OPA/Conftest policy gate
//  - Infracost cost diff
//  - SBOM (Syft) + Trivy scan
//  - Dependabot weekly updates
//  - Logger + ADR stub
//
// Run: node tools/v3_guardian.mjs --apply

import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const APPLY = new Set(process.argv.slice(2)).has("--apply");
const W = (p) => path.join(CWD, p);
const log = (...m) => console.log("[v3]", ...m);

function ensureDir(d) {
  if (!fs.existsSync(d)) {
    if (APPLY) fs.mkdirSync(d, { recursive: true });
    log("DIR  ", path.relative(CWD, d));
  }
}
function writeIfMissing(f, c) {
  if (!fs.existsSync(f)) {
    if (APPLY) { ensureDir(path.dirname(f)); fs.writeFileSync(f, c, "utf8"); }
    log("CREATE", path.relative(CWD, f));
  }
}

// ---------------------------------------------------------------------------
// 1) Denylist + pre-commit hook (Legal Hard Rail)
// ---------------------------------------------------------------------------
ensureDir(W(".config"));
writeIfMissing(
  W(".config/denylist.regex"),
  [
    "# Blocked patterns (case-insensitive)",
    "(?i)auto[-_ ]?book",
    "(?i)captcha.*bypass",
    "(?i)headless.*click\\(",
  ].join("\n") + "\n"
);
ensureDir(W(".git/hooks"));
writeIfMissing(
  W(".git/hooks/pre-commit"),
  `#!/bin/sh
DENYFILE=".config/denylist.regex"
[ -f "$DENYFILE" ] || exit 0
git diff --cached --name-only | while read file; do
  [ -f "$file" ] || continue
  if grep -E -i -f "$DENYFILE" "$file" >/dev/null 2>&1; then
    echo "❌ blocked by denylist: $file"
    exit 1
  fi
done
exit 0
`
);
if (APPLY) { try { fs.chmodSync(W(".git/hooks/pre-commit"), 0o755); } catch {} }

// ---------------------------------------------------------------------------
// 2) Local governance knobs (budget, timing)
// ---------------------------------------------------------------------------
writeIfMissing(
  W(".config/budget.json"),
  JSON.stringify({ dailyRequestsMax: 150, backoffMs: 15000, retryLimit: 2 }, null, 2)
);
writeIfMissing(
  W(".config/windows.yaml"),
  `hot:
  - "08:00-09:15"
  - "11:50-12:15"
  - "16:55-17:20"
coldCheckMinutes: 45
jitterMs: 7000
`
);

// ---------------------------------------------------------------------------
// 3) Legal & Security policies (solo-safe defaults)
// ---------------------------------------------------------------------------
writeIfMissing(
  W("policies/LEGAL.md"),
  `# Legal-First
- Read-only availability checks; never automate bookings or scripted clicks.
- Respect robots.txt / ToS / rate limits.
- No CAPTCHA bypass.
- eID flows: guide users; never store private keys/certs.
- Default retention ≤ 30 days; anonymize when possible.
`
);
writeIfMissing(
  W("policies/SECURITY.md"),
  `# Security (Solo)
- Keep secrets out of repo (.env only).
- Use HttpOnly cookies > localStorage.
- Rotate keys regularly; least privilege.
- Logs: redact PII.
`
);

// ---------------------------------------------------------------------------
// 4) Runbook — NIE / eID / Renewal
// ---------------------------------------------------------------------------
writeIfMissing(
  W("docs/RUNBOOK_NIE_EID_RENEWAL.md"),
  `# Runbook — NIE / eID / Renewal
## If official site changes
- Pause affected office; show "maintenance" notice.
- Update parsing/text rules; test; resume.
## If eID (Cl@ve/FNMT) down
- Fallback to appointment alerts; show banner.
## If false positives rise
- Raise thresholds; enable reconfirmation mode; review hot windows.
## Communication
- Always disclose: "We notify, not book."
`
);

// ---------------------------------------------------------------------------
// 5) Enterprise Checks (optional, CHECK_ENTERPRISE=1)
// ---------------------------------------------------------------------------
if (process.env.CHECK_ENTERPRISE === "1") {
  log("\n# Enterprise mode ON — generating CI & observability scaffolds");

  // --- 5.1 GitHub Actions Workflows dir ---
  ensureDir(W(".github/workflows"));

  // OPA/Conftest policy check
  writeIfMissing(
    W(".github/workflows/opa_policy.yml"),
    `name: OPA Policy Validation
on: [pull_request]
jobs:
  policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Conftest
        run: curl -L https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz | tar xz && sudo mv conftest /usr/local/bin/
      - name: Validate Rego Policies
        run: conftest test infra/policy.rego || (echo "::error::Policy violation" && exit 1)
`
  );

  // Infracost cost diff
  writeIfMissing(
    W(".github/workflows/infracost.yml"),
    `name: Infracost
on: [pull_request]
jobs:
  infracost:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Infracost
        uses: infracost/actions/setup@v3
      - name: Comment PR with cost diff
        uses: infracost/actions/comment@v3
        with:
          path: infracost-*.json
`
  );

  // SBOM + Trivy + Dependabot
  writeIfMissing(
    W(".github/workflows/security.yml"),
    `name: Security Scans
on:
  schedule:
    - cron: '0 2 * * 1'
  workflow_dispatch:
jobs:
  sbom_trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SBOM (Syft)
        run: docker run --rm -v \${{ github.workspace }}:/src anchore/syft:latest dir:/src -o json > sbom.json
      - name: Trivy Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          severity: CRITICAL,HIGH
          ignore-unfixed: true
  dependabot:
    runs-on: ubuntu-latest
    steps:
      - uses: dependabot/fetch-metadata@v2
`
  );

  // ADR and logger stub
  ensureDir(W("docs/adr"));
  writeIfMissing(
    W("docs/adr/ADR_0001_AI_LOGGER_OBSERVABILITY.md"),
    `# ADR-0001: AI Observability & Logging
## Context
We need lightweight telemetry for AI completion requests and NIE/eID events.
## Decision
- Implement structured logger with rotating JSON files.
- Capture request_id, model, latency, token_usage.
- Keep logs for <=30 days (respect RETENTION_DAYS).
## Consequences
- Enables future evals and error correlation.
- Minor I/O cost, acceptable for solo scale.
`
  );
  ensureDir(W("backend/src/utils"));
  writeIfMissing(
    W("backend/src/utils/logger.mjs"),
    `import fs from "node:fs";
const LOG_PATH = "./logs/ai_observability.log";
export function logEvent(event, data={}){
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + "\\n";
  try { fs.appendFileSync(LOG_PATH, line); }
  catch(e){ console.warn("[logger] failed:", e.message); }
}
`
  );
} else {
  log("\n# Enterprise mode OFF — CI and advanced observability skipped");
}

// ---------------------------------------------------------------------------
// 6) Status note
// ---------------------------------------------------------------------------
writeIfMissing(
  W(`docs/reports/v3_${new Date().toISOString().replace(/[:.]/g, "-")}.md`),
  `# v3 Governance (Hybrid)
Applied=${APPLY}
- Denylist & pre-commit hook
- Budget & window knobs
- Legal/Security policies & runbook
${process.env.CHECK_ENTERPRISE === "1"
    ? "- Enterprise CI/Observability scaffolds active"
    : "- Enterprise scaffolds skipped"}`
);

console.log(APPLY ? "[v3] Applied." : "[v3] DRY-RUN. Run with --apply to write.");
