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

  // Handle the event types you care about
  try {
    // Idempotency: check if we've already processed this event
    const eventId = event.id;
    if (supabaseAdmin) {
      // Try to insert into a stripe_events table; if the event_id exists, skip processing
      try {
        const { error: insertErr } = await supabaseAdmin.from("stripe_events").insert({ id: eventId, type: event.type, received_at: new Date().toISOString() });
        if (insertErr) {
          // If insert fails due to conflict (already exists), skip processing
          if (insertErr.code && insertErr.code === "23505") {
            console.log("Event already processed, skipping", eventId);
            return res.json({ received: true, skipped: true });
          }
        }
      } catch (e) {
        // Non-fatal -- continue (we may log)
        console.warn("Could not record event id for idempotency", e?.message || e);
      }
    }

    switch (event.type) {
      case "checkout.session.completed":
        // Fulfill subscription purchase, link to user, etc.
        console.log("checkout.session.completed", event.data.object.id);
        // Persist subscription details to Supabase if available
        if (supabaseAdmin) {
          try {
            const session = event.data.object;
            // session.subscription is the stripe subscription id
            const subscriptionId = session.subscription || null;
            const customerId = session.customer || null;
            const metadata = session.metadata || {};
            const userId = metadata.user_id || metadata.user || null; // try common metadata fields

            const upsertBody = {
              id: subscriptionId,
              user_id: userId,
              status: "active",
              price_id: session.display_items ? session.display_items[0]?.price?.id : null,
              current_period_end: null,
              customer_id: customerId,
              raw: session,
            };

            await supabaseAdmin.from("subscriptions").upsert(upsertBody, { onConflict: ["id"] });
          } catch (e) {
            console.warn("Failed to upsert subscription", e?.message || e);
          }
        }
        break;
      case "invoice.paid":
        // Continue to provision services
        console.log("invoice.paid", event.data.object.id);
        if (supabaseAdmin) {
          try {
            const inv = event.data.object;
            const subscriptionId = inv.subscription;
            await supabaseAdmin.from("subscriptions").upsert({ id: subscriptionId, status: "active", current_period_end: new Date(inv.current_period_end * 1000).toISOString() }, { onConflict: ["id"] });
          } catch (e) {
            console.warn("Failed to update subscription for invoice.paid", e?.message || e);
          }
        }
        break;
      case "invoice.payment_failed":
        // Notify user, take action
        console.log("invoice.payment_failed", event.data.object.id);
        if (supabaseAdmin) {
          try {
            const inv = event.data.object;
            const subscriptionId = inv.subscription;
            await supabaseAdmin.from("subscriptions").upsert({ id: subscriptionId, status: "past_due" }, { onConflict: ["id"] });
          } catch (e) {
            console.warn("Failed to mark subscription past_due", e?.message || e);
          }
        }
        break;
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (processErr) {
    console.error("Error processing webhook event", processErr);
    return res.status(500).send();
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
});

export default router;
