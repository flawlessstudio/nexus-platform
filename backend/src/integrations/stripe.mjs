export async function createCheckoutSession({priceId, successUrl, cancelUrl}){
  try { const { default: Stripe } = await import("stripe"); const stripe=new Stripe(process.env.STRIPE_KEY); 
    const session = await stripe.checkout.sessions.create({ mode:"subscription", line_items:[{price:priceId,quantity:1}], success_url:successUrl, cancel_url:cancelUrl });
    return { url: session.url };
  } catch(e){ console.warn("[stripe] WARN:", e.message||e); return { url: null, warn:"Stripe not installed or invalid key" }; }
}
