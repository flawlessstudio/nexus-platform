# Runbook: Deployment Rollback

This runbook provides instructions for rolling back a failed or problematic deployment on Vercel.

---

## Vercel Rollback Procedure

Vercel maintains immutable deployments, making rollbacks safe and fast.

1.  **Identify the Bad Deployment:**
    *   Go to your project's dashboard on Vercel.
    *   Navigate to the **Deployments** tab.
    *   Identify the current `Production` deployment that is causing issues.

2.  **Find the Last Known Good Deployment:**
    *   Scroll down the list to find the previous deployment that was stable. It will likely be the one deployed just before the problematic one.

3.  **Promote the Good Deployment:**
    *   Click the three-dot menu (`...`) next to the last known good deployment.
    *   Select **"Promote to Production"**.

4.  **Confirm:**
    *   Vercel will instantly switch the `your-domain.com` alias to point to this older, stable deployment. The problematic deployment is kept for inspection but no longer receives production traffic.

5.  **Verify:**
    *   Open your production URL in an incognito browser window to confirm that the site is back to its stable state.
