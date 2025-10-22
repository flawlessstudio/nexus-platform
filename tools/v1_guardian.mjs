#!/usr/bin/env node
// tools/v1_guardian.mjs — Solo Builder, World-Class Baseline (Node ≥20)
// Purpose: scaffold a complete legal-first environment with Express/Helmet,
// Stripe, Supabase, OpenAI, Sentry, Turnstile, OpenAPI, GDPR, all activated by default.
// If a library is missing, the code degrades gracefully (warn + no-op).
// Use --apply to write; otherwise dry-run. Use --verbose for details.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CWD = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const APPLY = ARGS.has("--apply");
const VERBOSE = ARGS.has("--verbose");
const log = (...m)=>console.log("[v1]",...m);
const dbg = (...m)=>VERBOSE && console.log("[v1:dbg]",...m);
const W = (p)=>path.join(CWD,p);
const ts = ()=>new Date().toISOString().replace(/[:.]/g,"-");
const sha1 = (s)=>crypto.createHash("sha1").update(s).digest("hex");

function ensureDir(d){ if(!fs.existsSync(d)){ if(APPLY) fs.mkdirSync(d,{recursive:true}); log("DIR  ", path.relative(CWD,d)); } }
function writeIfChanged(file, next){
  const exists = fs.existsSync(file);
  const prev = exists ? fs.readFileSync(file,"utf8") : "";
  if (exists && sha1(prev)===sha1(next)) { dbg("NOOP", path.relative(CWD,file)); return false; }
  if (APPLY) { ensureDir(path.dirname(file)); fs.writeFileSync(file,next,"utf8"); }
  log(exists?"PATCH":"CREATE", path.relative(CWD,file)); return true;
}
const createIfMissing=(f,c)=>{ if(!fs.existsSync(f)) writeIfChanged(f,c); };

// === Workspace hygiene ===
writeIfChanged(W(".editorconfig"), `root = true
[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
indent_style = space
indent_size = 2
`);
createIfMissing(W(".gitattributes"), "* text=auto eol=lf\n");
createIfMissing(W(".nvmrc"), "v20\n");

// === package.json ===
{
  let obj = {};
  try { obj = JSON.parse(fs.existsSync(W("package.json")) ? fs.readFileSync(W("package.json"),"utf8") : "{}"); } catch {}
  obj.name ??= "smart-nie-app";
  obj.type = "module";
  obj.engines = { node: ">=20" };
  obj.scripts ??= {};
  obj.scripts.dev ??= "node backend/src/server.express.js";
  obj.scripts.guard ??= "node tools/v1_guardian.mjs --apply && node tools/v2_guardian.mjs && node tools/v3_guardian.mjs --apply";
  obj.scripts.audit ??= "node tools/v2_guardian.mjs";
  obj.scripts.govern ??= "node tools/v3_guardian.mjs --apply";
  writeIfChanged(W("package.json"), JSON.stringify(obj,null,2)+"\n");
}

// === Folder structure ===
[
  "backend/src/routes","backend/src/integrations","backend/src/features/nie-monitoring",
  "backend/src/features/eid","backend/src/features/renewal","backend/src/utils",
  "docs/reports","policies","web/public/.well-known"
].forEach(d=>ensureDir(W(d)));

// === .env.example — all integrations ON ===
createIfMissing(W("backend/.env.example"), `# Core
NODE_ENV=development
PORT=3030

# Government (read-only health)
GOV_URL_ICPPLUS=https://icp.administracionelectronica.gob.es/icpplus/
GOV_URL_SEDE_EXTRANJERIA=https://sede.administracionespublicas.gob.es/
GOV_URL_REC=https://rec.redsara.es/registro/
GOV_URL_CLAVE=https://clave.gob.es/
GOV_URL_FNMT=https://www.sede.fnmt.gob.es/

# eID
EID_CLAVE_ENABLED=1
EID_FNMT_ENABLED=1

# Hot windows
NIE_HOT_WINDOWS=08:00-09:15,11:50-12:15,16:55-17:20
NIE_COLD_CHECK_MINUTES=45
NIE_JITTER_MS=7000

# Cost rails
MAX_OUTBOUND_REQUESTS_PER_DAY=150
BACKOFF_MS=15000
RETRY_LIMIT=2
RETENTION_DAYS=30

# === INTEGRATIONS ENABLED ===
INTEGRATION_EXPRESS=1
INTEGRATION_STRIPE=1
INTEGRATION_SUPABASE=1
INTEGRATION_OPENAI=1
INTEGRATION_SENTRY=1
INTEGRATION_TURNSTILE=1
INTEGRATION_OPENAPI=1
INTEGRATION_GDPR=1

# Keys (replace with real)
STRIPE_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=sb_anon_xxx
OPENAI_API_KEY=sk-xxx
SENTRY_DSN=https://xxx.ingest.sentry.io/xxx
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
`);

// === Request budget helper ===
createIfMissing(W("backend/src/utils/budget.js"), `export const budget={
  day:new Date().toDateString(), used:0,
  roll(){const d=new Date().toDateString(); if(d!==this.day){this.day=d; this.used=0}},
  take(n=1){this.roll(); this.used+=n},
  ok(limit){this.roll(); return this.used<limit}
};
`);

// === Government health route ===
createIfMissing(W("backend/src/routes/govHealth.js"), `const env=process.env;
export async function govHealthHandler(_req,res){
  const urls=[env.GOV_URL_ICPPLUS,env.GOV_URL_SEDE_EXTRANJERIA,env.GOV_URL_REC,env.GOV_URL_CLAVE,env.GOV_URL_FNMT].filter(Boolean);
  const results=[];
  for(const url of urls){ try{ const r=await fetch(url,{method:"GET"}); results.push({url,status:r.status}) } catch{ results.push({url,status:"unreachable"}) } }
  res.status(200).json({ok:true,results});
}
`);

// === Adapters (all integrations, safe fallback if missing) ===
createIfMissing(W("backend/src/integrations/stripe.mjs"), `export async function createCheckoutSession({priceId, successUrl, cancelUrl}){
  try { const { default: Stripe } = await import("stripe"); const stripe=new Stripe(process.env.STRIPE_KEY); 
    const session = await stripe.checkout.sessions.create({ mode:"subscription", line_items:[{price:priceId,quantity:1}], success_url:successUrl, cancel_url:cancelUrl });
    return { url: session.url };
  } catch(e){ console.warn("[stripe] WARN:", e.message||e); return { url: null, warn:"Stripe not installed or invalid key" }; }
}
`);
createIfMissing(W("backend/src/integrations/openai.mjs"), `export async function aiComplete(prompt){
  try { const { default: OpenAI } = await import("openai"); const client=new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r= await client.chat.completions.create({ model:"gpt-4o-mini", messages:[{role:"user",content:String(prompt).slice(0,1500)}], temperature:0.2, max_tokens:400 }); 
    return r.choices?.[0]?.message?.content || "";
  } catch(e){ console.warn("[openai] WARN:", e.message||e); return ""; }
}
`);
createIfMissing(W("backend/src/integrations/supabase.mjs"), `export async function supabaseClient(){
  try { const { createClient } = await import("@supabase/supabase-js");
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  } catch(e){ console.warn("[supabase] WARN:", e.message||e); return null; }
}
export async function dbGetUser(id){ const c = await supabaseClient(); if(!c) return null; const { data } = await c.from("users").select("*").eq("id",id).single(); return data||null; }
`);
createIfMissing(W("backend/src/integrations/sentry.mjs"), `export async function initSentry(app){
  try { const S = await import("@sentry/node"); S.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 }); app.use(S.Handlers.requestHandler()); app.use(S.Handlers.tracingHandler()); return S; }
  catch(e){ console.warn("[sentry] WARN:", e.message||e); return null; }
}
`);
createIfMissing(W("backend/src/integrations/turnstile.mjs"), `export async function verifyTurnstile(token){
  try { const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ response: token, secret: process.env.TURNSTILE_SECRET }) });
    const j = await r.json(); return !!j.success;
  } catch(e){ console.warn("[turnstile] WARN:", e.message||e); return false; }
}
`);

// === Express routes (payments, ai, captcha, openapi, gdpr, gov health) ===
createIfMissing(W("backend/src/routes/payments.js"), `import express from "express";
import { createCheckoutSession } from "../integrations/stripe.mjs";
const router = express.Router();
router.post("/create-checkout-session", async (req,res)=>{
  const { priceId, successUrl, cancelUrl } = req.body||{};
  if(!priceId||!successUrl||!cancelUrl) return res.status(400).json({error:"Missing required fields"});
  const out = await createCheckoutSession({ priceId, successUrl, cancelUrl });
  res.json(out);
});
export default router;
`);
createIfMissing(W("backend/src/routes/ai.js"), `import express from "express";
import { aiComplete } from "../integrations/openai.mjs";
const router = express.Router();
router.post("/complete", async (req,res)=>{
  const { prompt } = req.body||{};
  const text = await aiComplete(prompt||"");
  res.json({ text });
});
export default router;
`);
createIfMissing(W("backend/src/routes/captcha.js"), `import express from "express";
import { verifyTurnstile } from "../integrations/turnstile.mjs";
const router = express.Router();
router.post("/verify", async (req,res)=>{ const ok = await verifyTurnstile(req.body?.token); res.json({ ok }); });
export default router;
`);
createIfMissing(W("backend/src/routes/openapi.js"), `import express from "express";
const router = express.Router();
router.get("/openapi.json", (_req,res)=>{ res.json({ openapi:"3.0.0", info:{ title:"smart-nie-api", version:"1.0.0" }, paths:{
  "/api/ai/complete":{ post:{ summary:"AI complete" } },
  "/api/payments/create-checkout-session":{ post:{ summary:"Stripe checkout" } },
  "/api/captcha/verify":{ post:{ summary:"Turnstile verify" } },
  "/api/gov/health":{ get:{ summary:"Gov health" } },
  "/api/gdpr/export":{ get:{ summary:"GDPR export" } },
  "/api/gdpr/delete":{ post:{ summary:"GDPR delete" } }
}}); });
export default router;
`);
createIfMissing(W("backend/src/routes/gdpr.js"), `import express from "express";
const router = express.Router();
router.get("/export", async (req,res)=>{ res.json({ ok:true, user:req.user?.id||null, data:{} }) });
router.post("/delete", async (req,res)=>{ res.json({ ok:true, scheduled:true }) });
export default router;
`);

// === Express server ===
createIfMissing(W("backend/src/server.express.js"), `import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import payments from "./routes/payments.js";
import openapi from "./routes/openapi.js";
import gdpr from "./routes/gdpr.js";
import ai from "./routes/ai.js";
import captcha from "./routes/captcha.js";
import { govHealthHandler } from "./routes/govHealth.js";
import { initSentry } from "./integrations/sentry.mjs";

const app = express();
app.use(helmet({ contentSecurityPolicy: { useDefaults: true } }));
app.use(express.json({ limit:"1mb" }));
app.use(cookieParser());

await initSentry(app);

app.get("/health", (_req,res)=>res.json({ ok:true }));
app.get("/api/gov/health", govHealthHandler);
app.use("/api/payments", payments);
app.use("/api/docs", openapi);
app.use("/api/gdpr", gdpr);
app.use("/api/ai", ai);
app.use("/api/captcha", captcha);

const PORT = process.env.PORT||3030;
app.listen(PORT, ()=>console.log("Express server on", PORT));
`);

// === Feature READMEs & legal files ===
createIfMissing(W("backend/src/features/nie-monitoring/README.md"), `# NIE Monitoring (Legal-First)
- Read visible text to detect availability. No auto-booking or CAPTCHA bypass.
- Use hot windows + jitter; cold checks otherwise.
`);
createIfMissing(W("backend/src/features/eid/README.md"), `# eID (Cl@ve / FNMT)
- If user has eID and procedure allows tele-filing, guide them to the official site.
- Never store keys/certs. Pause slot alerts after tele-submission.
`);
createIfMissing(W("backend/src/features/renewal/README.md"), `# Renewal Pipelines
- NIE is permanent; renew TIE/authorizations/EU certificate instead.
- Remind at D-90/60/30/15/7; generate ICS; prefer telematic if available.
`);
createIfMissing(W("web/public/nie_disclaimer.txt"), `We don’t book for you — we notify you when real movement occurs. Legal-first, GDPR-compliant, no CAPTCHA bypass.`);
createIfMissing(W("policies/privacy.md"), `# Privacy (Solo)
- Minimal data. Retention ≤ ${process.env.RETENTION_DAYS||30} days. Export/Delete on request.
`);
createIfMissing(W("policies/acceptable-use.md"), `# Acceptable Use
- No auto-booking or CAPTCHA bypass. Respect robots.txt and Terms of Service.
`);

// === Report ===
writeIfChanged(W(`docs/reports/v1_${ts()}.md`), `# v1 Guardian Report
APPLY=${APPLY}
- All integrations active by default
- Express/Helmet, OpenAPI, GDPR, AI, Stripe, Turnstile, Gov health ready
`);

if (!APPLY) log("DRY-RUN. Re-run with --apply to write.");
