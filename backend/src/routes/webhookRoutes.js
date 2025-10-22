import express from "express";
import Stripe from "stripe";
import { env } from "../utils/env.js";
import { supabaseAdmin } from "../utils/supabaseAdmin.js";

const router = express.Router();
const stripe = env.STRIPE_KEY ? new Stripe(env.STRIPE_KEY) : null;

// Stripe requires the raw request body to validate signatures. We rely on
// server.express.js to have saved the raw buffer as req.rawBody via the
// express.json verify hook.
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn("STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).send("Webhook secret not configured");
  }

  if (!sig || !req.rawBody) {
    return res.status(400).send("Missing signature or raw body");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.warn("⚠️  Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Enqueue the event into webhook_queue for background processing
  try {
    if (supabaseAdmin) {
      const { error: qErr } = await supabaseAdmin.from("webhook_queue").insert({ event_id: event.id, event_type: event.type, payload: event });
      if (qErr) {
        console.warn("Failed to enqueue webhook event", qErr.message || qErr);
      }
    }
  } catch (e) {
    console.warn("Error while enqueuing webhook event", e?.message || e);
  }

  // Respond quickly to Stripe to acknowledge receipt
  res.json({ received: true, enqueued: true });
});

export default router;
