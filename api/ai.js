import { aiComplete } from "../backend/src/integrations/openai.mjs";
export default async function handler(req,res){ if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{ const { prompt }=req.body||{}; const text=await aiComplete(prompt||""); return res.status(200).json({ text }); }
  catch(e){ console.error("[api/ai]",e); return res.status(500).json({error:"AI error"}); }
}
