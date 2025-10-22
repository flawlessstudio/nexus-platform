import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { requestId } from "./middleware/requestId.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import payments from "./routes/payments.js";
import openapi from "./routes/openapi.js";
import gdpr from "./routes/gdpr.js";

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: { useDefaults: true } }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestId);

// Rate limiting
app.use("/api", apiLimiter);

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

// API routes
app.use("/api/payments", payments);
app.use("/api/docs", openapi);
app.use("/api/gdpr", gdpr);

export default app;
