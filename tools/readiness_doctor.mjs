#!/usr/bin/env node
/**
 * tools/readiness_doctor.mjs — Flawless Readiness Doctor (all-in-one)
 * Node >= 20, ESM. Run at repo root.
 *
 * Capabilities:
 *  - Audita .env (y Zod schema si existe) y detecta claves faltantes
 *  - Detecta y ejecuta builds (root/web/backend) con pnpm
 *  - Verifica Vercel CLI (whoami) y token
 *  - Health-check HTTP (NEXT_PUBLIC_SITE_URL o VERCEL_URL/custom URL)
 *  - Ping a Supabase REST (sin dependencias)
 *  - Genera reporte Markdown + JSON
 *  - CI gate (falla con critical/high o si build/whoami/health fallan)
 *  - Opcional: despliegue automático a Vercel (preview/prod) y smoke post-deploy
 *
 * Flags:
 *   --md-out <path>         MD out (default: docs/reports/READINESS_<ts>.md)
 *   --json-out <path>       JSON out (default: docs/reports/READINESS_<ts>.json)
 *   --env-paths "<list>"    Rutas .env (default: ".env,backend/.env,web/.env")
 *   --open                  Abre el MD al terminar (start/open/xdg-open)
 *   --ci                    CI mode (exit non-zero en fallos)
 *   --strict                En CI falla también por "high"
 *   --deploy=preview|prod   Despliega con Vercel y smoke-check la URL resultante
 *   --scope <team_slug>     Alcance Vercel (team)
 *   --project <nameOrId>    Proyecto Vercel (opcional)
 *   --health-url <url>      URL explícita para health-check (opcional)
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";

// ---------- Args / setup ----------
const CWD = process.cwd();
const NOW = new Date();
const pad = (n) => String(n).padStart(2, "0");
const TS = `${NOW.getFullYear()}${pad(NOW.getMonth() + 1)}${pad(NOW.getDate())}_${pad(NOW.getHours())}${pad(NOW.getMinutes())}${pad(NOW.getSeconds())}`;

const { values: ARGS } = parseArgs({
  options: {
    "md-out": { type: "string" },
    "json-out": { type: "string" },
    "env-paths": { type: "string" },
    open: { type: "boolean" },
    ci: { type: "boolean" },
    strict: { type: "boolean" },
    deploy: { type: "string" }, // preview | prod
    scope: { type: "string" },
    project: { type: "string" },
    "health-url": { type: "string" },
  },
  allowPositionals: true,
});

const OPEN = !!ARGS.open;
const CI_MODE = !!ARGS.ci;
const STRICT = !!ARGS.strict;
const DEPLOY = ARGS.deploy || ""; // "", "preview", "prod"
const SCOPE = ARGS.scope || "";
const PROJECT = ARGS.project || "";
const HEALTH_URL_MANUAL = ARGS["health-url"] || "";

const MD_OUT = ARGS["md-out"] || `docs/reports/READINESS_${TS}.md`;
const JSON_OUT = ARGS["json-out"] || `docs/reports/READINESS_${TS}.json`;
const ENV_PATHS = (ARGS["env-paths"] || ".env,backend/.env,web/.env,admin/.env")
  .split(",").map(s => s.trim()).filter(Boolean);

// ---------- FS helpers ----------
const abs = (rel) => path.join(CWD, rel);
const exists = (rel) => { try { return fs.existsSync(abs(rel)); } catch { return false; } };
const readText = (rel) => { try { return fs.readFileSync(abs(rel), "utf8"); } catch { return null; } };
const readJSON = (rel) => { const t = readText(rel); if (!t) return null; try { return JSON.parse(t); } catch { return null; } };
const ensureDirFor = (rel) => fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });

// ---------- Shell helper ----------
function sh(cmd, args = [], opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts });
  const code = res.status ?? 0;
  const out = (res.stdout || "") + (res.stderr || "");
  return { code, out };
}

// ---------- ENV audit ----------
function parseEnvLines(text) {
  const out = {};
  (text || "").split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  });
  return out;
}
function auditEnvSchema() {
  // Intenta detectar Zod schema para listar claves exigidas
  const file = ["backend/src/utils/env.ts", "backend/src/utils/env.js", "src/utils/env.ts", "src/utils/env.js"].find(exists);
  if (!file) return { file: null, keys: [], ok: false, error: "Env schema not found" };
  const src = readText(file) || "";
  const objMatch = src.match(/z\.object\s*\(\s*\{([\s\S]*?)\}\s*\)/m);
  if (!objMatch) return { file, keys: [], ok: false, error: "Could not parse z.object({ ... })" };
  const keys = [];
  const keyRegex = /([A-Z0-9_]+)\s*:\s*z\./g;
  let m;
  while ((m = keyRegex.exec(objMatch[1])) !== null) keys.push(m[1]);
  return { file, keys: [...new Set(keys)], ok: true };
}
function auditEnvPresence(envKeys) {
  const fileMap = {};
  for (const p of ENV_PATHS) if (exists(p)) fileMap[p] = readText(p) || "";
  const merged = {};
  Object.values(fileMap).forEach(txt => Object.assign(merged, parseEnvLines(txt)));
  const missing = envKeys.filter(k => !(k in merged));
  return { files: fileMap, merged, missing };
}

// ---------- Build detection ----------
function hasScript(dir, name) {
  const pkg = readJSON(path.join(dir, "package.json"));
  return !!pkg?.scripts?.[name];
}
function detectBuildTargets() {
  const targets = [];
  if (exists("package.json") && hasScript(".", "build")) targets.push({ label: "root", cmd: ["pnpm", ["run", "build"]] });
  if (exists("web/package.json") && hasScript("web", "build")) targets.push({ label: "web", cmd: ["pnpm", ["-C", "web", "run", "build"]] });
  if (exists("backend/package.json") && hasScript("backend", "build")) targets.push({ label: "backend", cmd: ["pnpm", ["-C", "backend", "run", "build"]] });
  return targets;
}

// ---------- Active checks ----------
async function healthCheck(explicitUrl = "") {
  const base =
    explicitUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!base) return { ok: false, urlTried: "", note: "No health URL (set --health-url or NEXT_PUBLIC_SITE_URL)" };
  const url = base.replace(/\/$/, "") + "/api/health";
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok
      ? { ok: true, urlTried: url, note: `/api/health → ${res.status}` }
      : { ok: false, urlTried: url, note: `/api/health → ${res.status}` };
  } catch (e) {
    return { ok: false, urlTried: url, note: "Fetch error: " + e.message };
  }
}
async function supabasePing(url, anon) {
  if (!url || !anon) return { ok: false, note: "SUPABASE_URL/ANON_KEY ausentes" };
  try {
    const res = await fetch(url.replace(/\/$/, "") + "/rest/v1/", {
      method: "GET",
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    return { ok: true, note: `REST ping → ${res.status}` };
  } catch (e) {
    return { ok: false, note: "Supabase fetch error: " + e.message };
  }
}
function vercelWhoAmI(token) {
  const args = ["whoami"];
  if (token) args.push("--token", token);
  if (SCOPE) args.push("--scope", SCOPE);
  const { code, out } = sh("vercel", args);
  if (code !== 0) return { ok: false, note: (out || "").trim() || "vercel whoami failed" };
  const line = out.split(/\r?\n/).find(Boolean) || out.trim();
  return { ok: true, note: line };
}
function pnpmVersion() {
  const { code, out } = sh("pnpm", ["-v"]);
  return code === 0 ? { ok: true, note: `pnpm ${out.trim()}` } : { ok: false, note: "pnpm no encontrado" };
}
function runBuilds() {
  const results = [];
  for (const t of detectBuildTargets()) {
    const { code, out } = sh(t.cmd[0], t.cmd[1], { cwd: CWD, env: process.env });
    results.push({
      target: t.label,
      ok: code === 0,
      note: code === 0 ? "build OK" : (out.slice(-800) || "build failed"),
    });
  }
  return results;
}

// ---------- Vercel deploy ----------
function parseDeploymentUrl(output) {
  // Busca la última URL .vercel.app o una https://<dominio>
  const urls = [...output.matchAll(/https?:\/\/[^\s"'`]+/g)].map(m => m[0]);
  const vercelUrl = urls.reverse().find(u => /\.vercel\.app/.test(u)) || urls[0] || "";
  return vercelUrl?.replace(/[\.\)\]]+$/, "");
}
function vercelDeploy({ token, prod = false }) {
  const args = ["deploy", "--confirm"];
  if (prod) args.push("--prod");
  if (token) args.push("--token", token);
  if (SCOPE) args.push("--scope", SCOPE);
  if (PROJECT) args.push("--project", PROJECT);
  // Si ya tienes prebuild local: args.push("--prebuilt")
  const { code, out } = sh("vercel", args, { cwd: CWD, env: process.env });
  const url = parseDeploymentUrl(out || "");
  return { ok: code === 0 && !!url, code, url, raw: out };
}

// ---------- Reporting ----------
const Severity = Object.freeze({ critical: "critical", high: "high", medium: "medium", low: "low", info: "info" });
const Weights = Object.freeze({ critical: 10, high: 6, medium: 3, low: 1, info: 0 });
const risk = (severity, title, details = "") => ({ severity, title, details });

function compileFindings({ envSchema, envPresence, active }) {
  const items = [];

  if (!envSchema.file) items.push(risk(Severity.high, "Env schema Zod no encontrado", "Crea backend/src/utils/env.(ts|js) con z.object({ ... })"));
  else if (!envSchema.keys.length) items.push(risk(Severity.medium, "Env schema detectado pero sin claves parseables", `Revisa ${envSchema.file}`));

  if (envPresence.missing.length) items.push(risk(Severity.critical, `Faltan ENV: ${envPresence.missing.join(", ")}`, "Añade en .env y/o variables Vercel"));

  // Gates operativos
  if (!active.pnpm?.ok) items.push(risk(Severity.high, "pnpm no disponible", active.pnpm?.note || ""));
  if (active.build.some(b => !b.ok)) items.push(risk(Severity.high, "Build fallida", active.build.filter(b => !b.ok).map(b => `${b.target}: ${b.note}`).join("\n")));
  if (!active.vercel?.ok) items.push(risk(Severity.high, "Vercel whoami falló", active.vercel?.note || ""));
  if (active.health && !active.health.ok) items.push(risk(Severity.high, "Health check falló", active.health.note || ""));
  if (active.supabase && !active.supabase.ok) items.push(risk(Severity.high, "Supabase ping falló", active.supabase.note || ""));

  const score = items.reduce((acc, r) => acc + (Weights[r.severity] || 0), 0);
  const criticals = items.filter(i => i.severity === Severity.critical).length;
  const highs = items.filter(i => i.severity === Severity.high).length;
  return { items, score, criticals, highs };
}

function mdJoin(parts) { return parts.filter(Boolean).join("\n"); }
function renderMarkdown({ envSchema, envPresence, active, deploy }) {
  const b = (ok) => ok ? "✅" : "❌";
  const buildLines = active.build.length
    ? active.build.map(r => `- ${b(r.ok)} **build ${r.target}** — ${r.note}`).join("\n")
    : "- (no se detectaron scripts de build)";

  return mdJoin([
    `# Readiness Report
_Generated: ${NOW.toISOString()}_

## TL;DR
- Env schema: \`${envSchema.file ?? "NOT FOUND"}\`
- Missing env: ${envPresence.missing.length ? envPresence.missing.join(", ") : "none"}
- pnpm: ${b(!!active.pnpm?.ok)} ${active.pnpm?.note || ""}
- Vercel: ${b(!!active.vercel?.ok)} ${active.vercel?.note || ""}
- Health: ${b(!!active.health?.ok)} ${active.health?.note || ""}
- Supabase: ${b(!!active.supabase?.ok)} ${active.supabase?.note || ""}
${deploy?.url ? `- Deploy URL: ${deploy.url}` : ""}
`,
    `## Active Checks
${buildLines}
- ${b(!!active.vercel?.ok)} **Vercel CLI** — ${active.vercel?.note || "N/A"}
- ${b(!!active.health?.ok)} **Health** — ${active.health?.note || "N/A"} ${active.health?.urlTried ? `(${active.health.urlTried})` : ""}
- ${b(!!active.supabase?.ok)} **Supabase** — ${active.supabase?.note || "N/A"}
${deploy?.url ? `- ${b(!!deploy?.ok)} **Post-deploy smoke** — ${deploy?.note || ""} (${deploy.url})` : ""}`,
  ]);
}

function writeReports(md, json) {
  ensureDirFor(MD_OUT);
  ensureDirFor(JSON_OUT);
  fs.writeFileSync(abs(MD_OUT), md, "utf8");
  fs.writeFileSync(abs(JSON_OUT), JSON.stringify(json, null, 2), "utf8");
  console.log("✅ Reportes generados:");
  console.log("-", MD_OUT);
  console.log("-", JSON_OUT);
}
function openFile(filePath) {
  try {
    const full = abs(filePath);
    if (process.platform === "darwin") spawnSync("open", [full], { stdio: "ignore" });
    else if (process.platform === "win32") spawnSync("cmd", ["/c", "start", "", full], { stdio: "ignore", shell: true });
    else {
      const probe = spawnSync("which", ["xdg-open"], { encoding: "utf8" });
      if (probe.status === 0) spawnSync("xdg-open", [full], { stdio: "ignore" });
      else console.log("(info) xdg-open no disponible; abre manualmente:", full);
    }
  } catch (e) { console.log("(warn) No se pudo abrir automáticamente:", e.message); }
}

// ---------- Main ----------
(async function main() {
  // 1) Env schema + presence
  const envSchema = auditEnvSchema();
  const envPresence = auditEnvPresence(envSchema.keys);

  // 2) Active checks (local)
  const pnpm = pnpmVersion();
  const build = runBuilds();
  const vercel = vercelWhoAmI(process.env.VERCEL_TOKEN || "");
  const health = await healthCheck(HEALTH_URL_MANUAL);
  const supabase = await supabasePing(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const active = { pnpm, build, vercel, health, supabase };

  // 3) Optional deploy
  let deploy = null;
  if (DEPLOY === "preview" || DEPLOY === "prod") {
    if (!vercel.ok) {
      console.error("❌ No puedo desplegar: Vercel whoami falló.");
    } else {
      const isProd = DEPLOY === "prod";
      console.log(`\n🚀 Desplegando a Vercel (${isProd ? "PROD" : "PREVIEW"})...`);
      const res = vercelDeploy({ token: process.env.VERCEL_TOKEN || "", prod: isProd });
      if (!res.ok) {
        deploy = { ok: false, url: "", note: "Deploy failed", raw: res.raw?.slice(-1200) || "" };
      } else {
        // Post-deploy health
        const smoke = await healthCheck(res.url);
        deploy = { ok: smoke.ok, url: res.url, note: smoke.note || "ok" };
      }
    }
  }

  // 4) Findings + report
  const findings = compileFindings({ envSchema, envPresence, active });
  const out = { version: "all-in-one-1.0.0", generatedAt: NOW.toISOString(), envSchema, envPresence, active, deploy, findings };
  const md = renderMarkdown(out);
  writeReports(md, out);
  if (OPEN) openFile(MD_OUT);

  // 5) CI Gates
  if (CI_MODE) {
    const failOnCritical = findings.criticals > 0;
    const failOnHigh = STRICT && findings.highs > 0;
    const buildFailed = (active.build || []).some(b => !b.ok);
    const vercelFailed = !active.vercel?.ok;
    const healthFailed = active.health && !active.health.ok;

    if (failOnCritical || failOnHigh || buildFailed || vercelFailed || healthFailed) {
      console.error(
        `❌ CI gate: ${[
          failOnCritical && "critical",
          failOnHigh && "high",
          buildFailed && "build",
          vercelFailed && "vercel",
          healthFailed && "health",
        ].filter(Boolean).join(" + ")}`
      );
      process.exit(2);
    }
  }
})();
