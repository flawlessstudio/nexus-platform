import express from "express"; const router = express.Router();
router.get("/openapi.json", (_req,res)=>{ res.json({ openapi:"3.0.0", info:{ title:"nexus-platform", version:"v1" }, paths:{} }); });
export default router;
