import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import payments from "./routes/payments.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import openapi from "./routes/openapi.js";
import gdpr from "./routes/gdpr.js";
import ai from "./routes/ai.js";
import captcha from "./routes/captcha.js";
import { govHealthHandler } from "./routes/govHealth.js";
import { initSentry } from "./integrations/sentry.mjs";

const app = express();
app.use(helmet({ contentSecurityPolicy: { useDefaults: true } }));
// Preserve the raw body buffer for routes that need it (Stripe webhooks)
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    // store raw buffer for signature verification (Stripe requires exact raw bytes)
    try {
      req.rawBody = buf;
    } catch (e) {
      // ignore
    }
  },
}));
app.use(cookieParser());

await initSentry(app);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/gov/health", govHealthHandler);
// Lightweight ping endpoint for deployed verification
app.get("/api/ping", (_req, res) => res.json({ ok: true, time: Date.now() }));
app.use("/api/payments", payments);
// Webhook route (verifies Stripe signatures)
app.use("/api/payments", webhookRoutes);
app.use("/api/docs", openapi);
app.use("/api/gdpr", gdpr);
app.use("/api/ai", ai);
app.use("/api/captcha", captcha);

const PORT = process.env.PORT || 3030;

// If running on Vercel (serverless), export the app as the default handler
// Vercel will import this file and use the exported app as the handler.
// Local/dev behavior: start listening when not deployed on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log("Express server on", PORT));
}

// Export the Express app as the default export for serverless platforms (Vercel)
export default app;
