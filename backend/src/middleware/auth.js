import { createClient } from "@supabase/supabase-js";
import { env } from "../utils/env.js";

// This is a server-side-only client for validating tokens.
// It's safe to use the public URL and anon key here.
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

/**
 * Middleware to authenticate requests using a JWT from the Authorization header.
 * It verifies the token with Supabase and attaches the user object to the request.
 */
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided." });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Supabase token verification error:", error.message);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
  }

  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User not found." });
  }

  // Attach a simplified user object to the request for downstream use.
  req.user = {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role || "user", // Assumes a custom 'role' claim
  };

  next();
};
