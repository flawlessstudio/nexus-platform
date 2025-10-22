import { z } from "zod"; import dotenv from "dotenv"; dotenv.config();
export const env = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  STRIPE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  TURNSTILE_SECRET: z.string().optional(),
}).parse(process.env);
