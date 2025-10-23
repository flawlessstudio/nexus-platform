#!/usr/bin/env node
// tools/v1_guardian.mjs — Definitive, Dual-Mode Guardian (Node ≥20, zero deps)
// Modes:
//   - Default: Serverless/Vercel-first (modern tooling + /api + vercel.json)
//   - Monolith: set CHECK_MONOLITH=1 (Express + Helmet server on PORT)
//
// Usage:
//   node tools/v1_guardian.mjs            # dry-run
//   node tools/v1_guardian.mjs --apply    # write files
//   CHECK_MONOLITH=1 node tools/v1_guardian.mjs --apply   # monolith mode
//
// Guarantees:
//   - Legal-first templates (disclaimer, policies)
//   - Integrations stubs (OpenAI, Stripe, Supabase, Sentry, Turnstile)
//   - Env knobs for NIE windows, cost rails, retention
//   - Modern toolchain (pnpm, turbo, just, mise/direnv)
//   - Idempotent writes (content-hash compare)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CWD = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const APPLY = ARGS.has("--apply");
const VERBOSE = ARGS.has("--verbose");
const MONOLITH = process.env.CHECK_MONOLITH === "1";

const W = (p) => path.join(CWD, p);
const log = (...m) => console.log("[v1]", ...m);
const dbg = (...m) => VERBOSE && console.log("[v1:dbg]", ...m);
const ts = () => new Date().toISOString().replace(/[:.]/g, "-");
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

function ensureDir(d) {
  if (!fs.existsSync(d)) {
    if (APPLY) fs.mkdirSync(d, { recursive: true });
    log("DIR  ", path.relative(CWD, d));
  }
}
function writeIfChanged(file, next) {
  const exists = fs.existsSync(file);
  const prev = exists ? fs.readFileSync(file, "utf8") : "";
  if (exists && sha1(prev) === sha1(next)) {
    dbg("NOOP", path.relative(CWD, file));
    return false;
  }
  if (APPLY) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, next, "utf8");
  }
  log(exists ? "PATCH" : "CREATE", path.relative(CWD, file));
  return true;
}
const createIfMissing = (f, c) => { if (!fs.existsSync(f)) writeIfChanged(f, c); };

// -----------------------
// 1) Hygiene + ignores
// -----------------------
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
createIfMissing(W(".gitignore"), `node_modules
.pnpm-store
.env
.env.local
.DS_Store
logs
dist
.vercel
.vscode
`);

// -----------------------
// 2) package.json (mode-aware dev script)
// -----------------------
{
  let obj = {};
  try { obj = JSON.parse(fs.existsSync(W("package.json")) ? fs.readFileSync(W("package.json"), "utf8") : "{}"); } catch { }
  obj.name ??= "nexus-platform";
  obj.type = "module";
  obj.engines = { node: ">=20" };
  obj.scripts ??= {};
  obj.scripts.dev = MONOLITH ? "node backend/src/server.express.js" : "vercel dev";
  obj.scripts.build ??= "echo \"No build step for API-only; add frontend build if present\"";
  obj.scripts.test ??= "vitest run";
  obj.scripts.testui ??= "vitest";
  obj.scripts.e2e ??= "playwright test";
  obj.scripts.guard ??= "node tools/v1_guardian.mjs --apply && node tools/v2_guardian.mjs && node tools/v3_guardian.mjs --apply";
  obj.scripts.doctors ??= "node tools/v1_doctor.mjs --report && node tools/v2_doctor.mjs --report && node tools/v3_doctor.mjs --report";
  obj.scripts.govern ??= "node tools/v3_guardian.mjs --apply";
  obj.scripts.lint ??= "biome check . || true";
  obj.scripts.format ??= "biome format .";
  writeIfChanged(W("package.json"), JSON.stringify(obj, null, 2) + "\n");
}

// -----------------------
// 3) Modern tooling (always)
// -----------------------
createIfMissing(W("pnpm-workspace.yaml"), `packages:
  - "api"
  - "backend"
  - "web"
  - "tools"
`);
createIfMissing(W("turbo.json"), JSON.stringify({
  $schema: "https://turbo.build/schema.json",
  pipeline: {
    build: { dependsOn: ["^build"], outputs: ["dist/**", "build/**"] },
    test: { dependsOn: ["^build"] },
    dev: { cache: false }
  }
}, null, 2) + "\n");
createIfMissing(W(".tool-versions"), `node 20.11.1
python 3.12.5
`);
createIfMissing(W(".envrc"), `use_mise || true
dotenv_if_exists
`);
createIfMissing(W("justfile"), `default: dev

dev:
\t${MONOLITH ? "node backend/src/server.express.js" : "vercel dev"}

test:
\tpnpm test

e2e:
\tpnpm e2e

guard:
\tnode tools/v1_guardian.mjs --apply && node tools/v2_guardian.mjs && node tools/v3_guardian.mjs --apply

doctors:
\tnode tools/v1_doctor.mjs --report && node tools/v2_doctor.mjs --report && node tools/v3_doctor.mjs --report
`);

// -----------------------
// 4) Dirs
// -----------------------
[
  "backend/src/integrations",
  "backend/src/utils",
  "backend/src/features/nie-monitoring",
  "backend/src/features/eid",
  "backend/src/features/renewal",
  "policies",
  "docs/reports",
  "public"
].forEach((d) => ensureDir(W(d)));
if (MONOLITH) {
  ["backend/src/routes"].forEach((d) => ensureDir(W(d)));
} else {
  ["api"].forEach((d) => ensureDir(W(d)));
}

// -----------------------
// 5) .env.example (mode-aware)
// -----------------------
createIfMissing(W("backend/.env.example"), `# Core
NODE_ENV=development
${MONOLITH ? "PORT=3030\n" : ""}

# Government (read-only)
GOV_URL_ICPPLUS=https://icp.administracionelectronica.gob.es/icpplus/
GOV_URL_SEDE_EXTRANJERIA=https://sede.administracionespublicas.gob.es/
GOV_URL_REC=https://rec.redsara.es/registro/
GOV_URL_CLAVE=https://clave.gob.es/
GOV_URL_FNMT=https://www.sede.fnmt.gob.es/

# eID toggles
EID_CLAVE_ENABLED=1
EID_FNMT_ENABLED=1

# NIE windows & cost
NIE_HOT_WINDOWS=08:00-09:15,11:50-12:15,16:55-17:20
NIE_COLD_CHECK_MINUTES=45
NIE_JITTER_MS=7000
MAX_OUTBOUND_REQUESTS_PER_DAY=150
BACKOFF_MS=15000
RETRY_LIMIT=2
RETENTION_DAYS=30

# Integrations ON
INTEGRATION_EXPRESS=1
INTEGRATION_STRIPE=1
INTEGRATION_SUPABASE=1
INTEGRATION_OPENAI=1
INTEGRATION_SENTRY=1
INTEGRATION_TURNSTILE=1
INTEGRATION_OPENAPI=1
INTEGRATION_GDPR=1

# Secrets (fill in deployment env)
STRIPE_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=sb_anon_xxx
OPENAI_API_KEY=sk-xxx
SENTRY_DSN=https://xxx.ingest.sentry.io/xxx
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
`);

// -----------------------
// 6) Integrations (common to both modes; safe fallbacks)
// -----------------------
createIfMissing(W("backend/src/integrations/openai.mjs"), `export async function aiComplete(prompt){
  try { const { default: OpenAI } = await import("openai"); const client=new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r= await client.chat.completions.create({ model:"gpt-4o-mini", messages:[{role:"user",content:String(prompt).slice(0,1500)}], temperature:0.2, max_tokens:400 });
    return r.choices?.[0]?.message?.content || "";
  } catch(e){ console.warn("[openai] WARN:", e.message||e); return ""; }
}
`);
createIfMissing(W("backend/src/integrations/stripe.mjs"), `export async function createCheckoutSession({priceId, successUrl, cancelUrl}){
  try { const { default: Stripe } = await import("stripe"); const stripe=new Stripe(process.env.STRIPE_KEY);
    const session=await stripe.checkout.sessions.create({mode:"subscription", line_items:[{price:priceId,quantity:1}], success_url:successUrl, cancel_url:cancelUrl});
    return { url: session.url };
  } catch(e){ console.warn("[stripe] WARN:", e.message||e); return { url:null, warn:"Stripe not installed or invalid key" }; }
}
`);
createIfMissing(W("backend/src/integrations/turnstile.mjs"), `export async function verifyTurnstile(token){
  try { const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ response: token, secret: process.env.TURNSTILE_SECRET })});
    const j=await r.json(); return !!j.success;
  } catch(e){ console.warn("[turnstile] WARN:", e.message||e); return false; }
}
`);
createIfMissing(W("backend/src/integrations/supabase.mjs"), `export async function supabaseClient(){
  try { const { createClient } = await import("@supabase/supabase-js"); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); }
  catch(e){ console.warn("[supabase] WARN:", e.message||e); return null; }
}
export async function dbGetUser(id){ const c=await supabaseClient(); if(!c) return null; const { data }=await c.from("users").select("*").eq("id",id).single(); return data||null; }
`);
createIfMissing(W("backend/src/integrations/sentry.mjs"), `export async function initSentryForFunction(){ try{ const S=await import("@sentry/node"); S.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate:0.1 }); }catch{} }
export async function initSentry(app){
  try { const S = await import("@sentry/node"); S.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
    app?.use?.(S.Handlers.requestHandler()); app?.use?.(S.Handlers.tracingHandler()); return S;
  } catch(e){ console.warn("[sentry] WARN:", e.message||e); return null; }
}
`);

// -----------------------
// 7) Mode-specific scaffolding
// -----------------------
if (MONOLITH) {
  // --- Express routes ---
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
router.post("/complete", async (req,res)=>{ const { prompt }=req.body||{}; const text=await aiComplete(prompt||""); res.json({ text }); });
export default router;
`);
  createIfMissing(W("backend/src/routes/captcha.js"), `import express from "express";
import { verifyTurnstile } from "../integrations/turnstile.mjs";
const router = express.Router();
router.post("/verify", async (req,res)=>{ const ok=await verifyTurnstile(req.body?.token); res.json({ ok }); });
export default router;
`);
  createIfMissing(W("backend/src/routes/openapi.js"), `import express from "express";
const router = express.Router();
router.get("/openapi.json", (_req,res)=>{ res.json({ openapi:"3.0.0", info:{ title:"nexus-platform", version:"1.0.0" }, paths:{
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
router.post("/delete", async (_req,res)=>{ res.json({ ok:true, scheduled:true }) });
export default router;
`);
  createIfMissing(W("backend/src/routes/govHealth.js"), `const env=process.env;
export async function govHealthHandler(_req,res){
  const urls=[env.GOV_URL_ICPPLUS,env.GOV_URL_SEDE_EXTRANJERIA,env.GOV_URL_REC,env.GOV_URL_CLAVE,env.GOV_URL_FNMT].filter(Boolean);
  const results=[];
  for(const url of urls){ try{ const r=await fetch(url,{method:"GET"}); results.push({url,status:r.status}) } catch{ results.push({url,status:"unreachable"}) } }
  res.status(200).json({ok:true,results});
}
`);
  // --- Express server ---
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
  // No vercel.json in monolith mode
} else {
  // --- Serverless /api handlers ---
  createIfMissing(W("api/ai.js"), `import { aiComplete } from "../backend/src/integrations/openai.mjs";
export default async function handler(req,res){ if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{ const { prompt }=req.body||{}; const text=await aiComplete(prompt||""); return res.status(200).json({ text }); }
  catch(e){ console.error("[api/ai]",e); return res.status(500).json({error:"AI error"}); }
}
`);
  createIfMissing(W("api/payments.js"), `import { createCheckoutSession } from "../backend/src/integrations/stripe.mjs";
export default async function handler(req,res){ if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{ const { priceId, successUrl, cancelUrl }=req.body||{}; if(!priceId||!successUrl||!cancelUrl) return res.status(400).json({error:"Missing fields"});
    const out=await createCheckoutSession({priceId,successUrl,cancelUrl}); return res.status(200).json(out); }
  catch(e){ console.error("[api/payments]",e); return res.status(500).json({error:"Stripe error"}); }
}
`);
  createIfMissing(W("api/captcha.js"), `import { verifyTurnstile } from "../backend/src/integrations/turnstile.mjs";
export default async function handler(req,res){ if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{ const ok=await verifyTurnstile(req.body?.token); return res.status(200).json({ ok }); }
  catch(e){ console.error("[api/captcha]",e); return res.status(500).json({error:"Captcha verify error"}); }
}
`);
  createIfMissing(W("api/openapi.js"), `export default async function handler(_req,res){
  return res.status(200).json({ openapi:"3.0.0", info:{ title:"nexus-platform", version:"1.0.0" }, paths:{
    "/api/ai":{ post:{ summary:"AI complete" } },
    "/api/payments":{ post:{ summary:"Stripe checkout" } },
    "/api/captcha":{ post:{ summary:"Turnstile verify" } },
    "/api/gov-health":{ get:{ summary:"Gov health" } },
    "/api/gdpr":{ get:{ summary:"GDPR export" }, post:{ summary:"GDPR delete" } }
  }});
}
`);
  createIfMissing(W("api/gdpr.js"), `export default async function handler(req,res){
  if(req.method==="GET") return res.status(200).json({ ok:true, user:null, data:{} });
  if(req.method==="POST") return res.status(200).json({ ok:true, scheduled:true });
  return res.status(405).json({ error:"Method not allowed" });
}
`);
  createIfMissing(W("api/gov-health.js"), `export default async function handler(_req,res){
  const urls=[process.env.GOV_URL_ICPPLUS,process.env.GOV_URL_SEDE_EXTRANJERIA,process.env.GOV_URL_REC,process.env.GOV_URL_CLAVE,process.env.GOV_URL_FNMT].filter(Boolean);
  const results=[]; for(const url of urls){ try{const r=await fetch(url); results.push({url,status:r.status})}catch{results.push({url,status:"unreachable"})} }
  return res.status(200).json({ ok:true, results });
}
`);
  // vercel.json (serverless routing)
  createIfMissing(W("vercel.json"), JSON.stringify({
    version: 2,
    functions: { "api/*.js": { runtime: "nodejs20.x", memory: 1024, maxDuration: 10 } },
    routes: [
      { src: "/api/ai", dest: "/api/ai.js" },
      { src: "/api/payments", dest: "/api/payments.js" },
      { src: "/api/captcha", dest: "/api/captcha.js" },
      { src: "/api/openapi", dest: "/api/openapi.js" },
      { src: "/api/gov-health", dest: "/api/gov-health.js" },
      { src: "/api/gdpr", dest: "/api/gdpr.js" },
      { src: "/(.*)", dest: "/$1" }
    ]
  }, null, 2) + "\n");
}

// -----------------------
// 8) Legal & docs (shared)
// -----------------------
createIfMissing(W("public/nie_disclaimer.txt"), `We don’t book for you — we notify you when real movement occurs. Legal-first, GDPR-compliant, no CAPTCHA bypass.`);
createIfMissing(W("policies/privacy.md"), `# Privacy
- Minimal data. Retention ≤ ${process.env.RETENTION_DAYS || 30} days. Export/Delete on request.
`);
createIfMissing(W("policies/acceptable-use.md"), `# Acceptable Use
- No auto-booking or CAPTCHA bypass. Respect robots.txt and ToS.
`);
createIfMissing(W("backend/src/features/nie-monitoring/README.md"), `# NIE Monitoring (Legal-First)
Read visible texts only. No automation. Hot windows + jitter; cold checks otherwise.
`);
createIfMissing(W("backend/src/features/eid/README.md"), `# eID (Cl@ve / FNMT)
Guide users to official sites. Never store keys/certs. Pause alerts after tele-filing.
`);
createIfMissing(W("backend/src/features/renewal/README.md"), `# Renewal
NIE is permanent; renew TIE/permits/EU certificate instead. Remind D-90/60/30/15/7; ICS suggested.
`);

// -----------------------
// 9) Report
// -----------------------
writeIfChanged(W(`docs/reports/v1_${ts()}.md`), `# v1 Guardian (definitive) Report
APPLY=${APPLY}
MODE=${MONOLITH ? "MONOLITH (Express)" : "SERVERLESS (Vercel)"}
- Modern tooling ensured (pnpm, turbo, just, mise/direnv)
- ${MONOLITH ? "Express/Helmet app and routes created" : "Vercel /api handlers and vercel.json created"}
- Adapters present; legal docs present; env knobs present
`);

console.log(APPLY ? "[v1] Applied." : "[v1] DRY-RUN. Re-run with --apply to write.");
