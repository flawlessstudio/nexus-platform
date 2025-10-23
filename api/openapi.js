export default async function handler(_req,res){
  return res.status(200).json({ openapi:"3.0.0", info:{ title:"nexus-platform", version:"1.0.0" }, paths:{
    "/api/ai":{ post:{ summary:"AI complete" } },
    "/api/payments":{ post:{ summary:"Stripe checkout" } },
    "/api/captcha":{ post:{ summary:"Turnstile verify" } },
    "/api/gov-health":{ get:{ summary:"Gov health" } },
    "/api/gdpr":{ get:{ summary:"GDPR export" }, post:{ summary:"GDPR delete" } }
  }});
}
