import { createCheckoutSession } from "../backend/src/integrations/stripe.mjs";
export default async function handler(req,res){ if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{ const { priceId, successUrl, cancelUrl }=req.body||{}; if(!priceId||!successUrl||!cancelUrl) return res.status(400).json({error:"Missing fields"});
    const out=await createCheckoutSession({priceId,successUrl,cancelUrl}); return res.status(200).json(out); }
  catch(e){ console.error("[api/payments]",e); return res.status(500).json({error:"Stripe error"}); }
}
