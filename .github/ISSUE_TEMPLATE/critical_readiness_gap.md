---
name: '🚨 Critical Readiness Gap'
about: Report a critical or high-severity issue found by the Readiness Doctor script.
title: '🚨 Readiness Gap: [Category] - [Brief Description]'
labels: 'bug, security, critical-path'
assignees: ''

---

### Readiness Doctor Finding

A critical or high-severity readiness gap was identified by the `readiness_doctor.mjs` script. This issue must be addressed to ensure the platform's security, stability, and deployability.

---

### 📝 **1. Finding Details**

*(Copy the relevant finding from the "Prioritized Action List" in the generated Markdown report.)*

**Severity:** `critical` / `high`
**Title:**
**Details:**

### 🎯 **2. Acceptance Criteria**

- [ ] The root cause of the finding is identified and fixed.
- [ ] All required code changes are implemented and tested.
- [ ] Any necessary configuration changes (e.g., environment variables in Vercel, Supabase settings) are documented and applied.
- [ ] After the fix, running `node tools/readiness_doctor.mjs` no longer reports this specific issue.
- [ ] The overall risk score from the report is reduced.

### 📚 **3. Relevant Files & Context**

*(List any files, code snippets, or CI/CD workflow sections that are relevant to this issue. This helps provide context for the person who will fix it.)*

- `tools/readiness_doctor.mjs` (for audit logic)
-
-

---

*This issue was generated based on the output of the Readiness Doctor. To regenerate the report, run `node tools/readiness_doctor.mjs --open`.*
