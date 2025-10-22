import express from "express"; const router = express.Router();
router.get("/export", (req,res)=>{ res.json({ ok:true, user:req.user?.id || null, data:{} }) });
router.post("/delete", (req,res)=>{ res.json({ ok:true, scheduled:true }) });
export default router;
