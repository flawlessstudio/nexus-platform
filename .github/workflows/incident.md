# Runbook: Incident Response

This runbook outlines the steps to take when a critical incident occurs, such as a service outage, security breach, or major performance degradation.

**Incident Commander:** The person who discovers the incident is the initial Incident Commander (IC) until they hand it off.

---

## 1. Triage & Assess

*   **Identify the Impact:** What is broken? Who is affected? Is data at risk?
*   **Check Monitoring:** Review Sentry, Vercel logs, and Supabase status for initial clues.
*   **Severity Level:**
    *   **SEV-1 (Critical):** Platform down, data loss/breach, core payment/auth flow broken.
    *   **SEV-2 (High):** Major feature broken, significant performance degradation.
    *   **SEV-3 (Low):** Minor feature broken, cosmetic issues.

## 2. Communicate

*   **Internal:** Announce in the team channel: "🚨 SEV-1: [Brief Description]".
*   **External (if user-facing):** Update the public status page (e.g., Instatus).
    *   *Initial:* "Investigating issues with..."
    *   *Update:* "A fix has been identified and is being implemented."
    *   *Resolved:* "The issue has been resolved."

## 3. Mitigate & Resolve

*   **Form a Hypothesis:** What do you think is the cause?
*   **Attempt Mitigation:** Can you temporarily fix the issue? (e.g., roll back a deployment, restart a service, disable a feature flag).
*   **Develop a Permanent Fix:** Once mitigated, work on a permanent solution.
*   **Deploy the Fix:** Follow standard deployment procedures.

## 4. Post-Mortem

*   **Schedule a Post-Mortem:** Within 48 hours of resolution.
*   **Document:** Create a post-mortem document detailing the timeline, impact, root cause, and action items to prevent recurrence.
*   **Follow Up:** Ensure action items are tracked and completed.
