import express from "express";
import { aiComplete } from "../integrations/openai.mjs";
const router = express.Router();
router.post("/complete", async (req,res)=>{
  const { prompt } = req.body||{};
  const text = await aiComplete(prompt||"");
  res.json({ text });
});
export default router;
