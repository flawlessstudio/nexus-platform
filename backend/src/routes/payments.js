import express from "express"; import Stripe from "stripe"; import { env } from "../utils/env.js";
const router = express.Router(); const stripe = env.STRIPE_KEY ? new Stripe(env.STRIPE_KEY) : null;
router.post("/create-checkout-session", async (req,res)=>{
  if(!stripe) return res.status(500).json({error:"Stripe not configured"});
  const idempotencyKey = req.headers["idempotency-key"];
  const { priceId, successUrl, cancelUrl } = req.body || {};
  if(!priceId || !successUrl || !cancelUrl) return res.status(400).json({error:"Missing fields"});
  const session = await stripe.checkout.sessions.create({
    mode:"subscription", line_items:[{price:priceId, quantity:1}],
    success_url: successUrl, cancel_url: cancelUrl
  }, idempotencyKey ? { idempotencyKey } : {});
  res.json({ url: session.url });
});
export default router;
