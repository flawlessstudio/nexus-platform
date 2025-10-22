import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * A Supabase client initialized with the service_role key for admin-level operations.
 * This should only ever be used in secure, server-side environments.
 * It will be null if the required environment variables are not set.
 */
export const supabaseAdmin =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    : null;
