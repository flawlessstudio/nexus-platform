import express from "express";
import { verifyTurnstile } from "../integrations/turnstile.mjs";
const router = express.Router();
router.post("/verify", async (req,res)=>{ const ok = await verifyTurnstile(req.body?.token); res.json({ ok }); });
export default router;
