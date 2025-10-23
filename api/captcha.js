import { verifyTurnstile } from "../backend/src/integrations/turnstile.mjs";
export default async function handler(req,res){ if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{ const ok=await verifyTurnstile(req.body?.token); return res.status(200).json({ ok }); }
  catch(e){ console.error("[api/captcha]",e); return res.status(500).json({error:"Captcha verify error"}); }
}
