// tools/sanity_check.mjs
// NEXUS Platform — Monorepo Sanity Checker (frontend-only v1 safe)
// Run: node tools/sanity_check.mjs [--strict]
// Exit code: 0 (warnings allowed), or 1 in --strict when there are errors.

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const CWD = process.cwd()
const W = (p) => path.join(CWD, p)
const exists = (p) => fs.existsSync(W(p))
const read = (p) => fs.readFileSync(W(p), 'utf8')
const isWin = os.platform() === 'win32'

const STRICT = process.argv.includes('--strict')

/** Pretty printing */
const ICON = {
  ok: '✔',
  warn: '⚠',
  err: '✖',
  info: '➤'
}
let ERRORS = 0
let WARNS = 0
const log = (icon, msg) => console.log(icon, msg)
const ok = (m) => log(ICON.ok, m)
const warn = (m) => { WARNS++; log(ICON.warn, m) }
const err = (m) => { ERRORS++; log(ICON.err, m) }
const info = (m) => log(ICON.info, m)

info(`NEXUS Sanity Check — ${new Date().toISOString()}`)
info(`Node version: ${process.version}`)

// 1) Node version
try {
  const major = Number(process.version.replace('v', '').split('.')[0])
  if (Number.isNaN(major) || major < 20) {
    err('Node >= 20 is required. Update Node or enable Corepack.')
  } else {
    ok('Node version OK (>=20)')
  }
} catch {
  err('Unable to parse Node version')
}

// 2) Workspace layout
const mustHave = ['web', 'backend', 'supabase', 'tools', '.github/workflows']
mustHave.forEach((d) => {
  if (!exists(d)) err(`Missing required directory: ${d}`)
  else ok(`Found ${d}/`)
})

// 3) Root files hygiene
if (exists('.vercel')) warn('Found /.vercel folder in repo. Do not commit local Vercel metadata.')
if (exists('vercel.json')) warn('Found /vercel.json at repo root. For Vercel, keep config inside /web/vercel.json.')

if (exists('pnpm-workspace.yaml')) ok('pnpm-workspace.yaml present')
else err('Missing pnpm-workspace.yaml at repo root')

if (exists('package.json')) ok('package.json present (root)')
else err('Missing root package.json')

// 4) Web project checks
if (!exists('web')) {
  // already flagged above
} else {
  // vercel.json (SPA rewrite)
  if (!exists('web/vercel.json')) {
    err('Missing web/vercel.json (required to prevent SPA 404s)')
  } else {
    try {
      const vcfg = JSON.parse(read('web/vercel.json'))
      const hasRewrite = Array.isArray(vcfg.rewrites) &&
        vcfg.rewrites.some(r => r.destination === '/index.html')
      if (!hasRewrite) {
        err('web/vercel.json is present but missing SPA rewrite to /index.html')
      } else ok('web/vercel.json OK (SPA rewrites)')
    } catch (e) {
      err(`web/vercel.json is not valid JSON: ${e.message}`)
    }
  }

  // env
  if (!exists('web/.env')) {
    warn('Missing web/.env (ok in CI). Ensure Vercel project has VITE_* vars configured.')
  } else {
    const env = read('web/.env')
    const need = ['VITE_SUPABASE_URL=', 'VITE_SUPABASE_ANON_KEY=']
    need.forEach((k) => {
      if (!env.includes(k)) err(`web/.env is missing ${k}`)
    })
    // dangerous keys in client
    const forbidden = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY=',
      'STRIPE_SECRET_KEY=',
      'STRIPE_WEBHOOK_SECRET=',
      'TURNSTILE_SECRET='
    ]
    const foundForbidden = forbidden.filter((k) => env.includes(k))
    if (foundForbidden.length) {
      err(`web/.env must NOT contain server secrets: ${foundForbidden.join(', ')}`)
    }

    // integration flags
    const flags = {
      STRIPE: env.match(/^VITE_INTEGRATION_STRIPE=(\d)/m)?.[1],
      OPENAI: env.match(/^VITE_INTEGRATION_OPENAI=(\d)/m)?.[1],
      SENTRY: env.match(/^VITE_INTEGRATION_SENTRY=(\d)/m)?.[1],
      TURNSTILE: env.match(/^VITE_INTEGRATION_TURNSTILE=(\d)/m)?.[1],
      SUPABASE: env.match(/^VITE_INTEGRATION_SUPABASE=(\d)/m)?.[1],
      GDPR: env.match(/^VITE_INTEGRATION_GDPR=(\d)/m)?.[1]
    }

    // If STRIPE or OPENAI enabled without API, warn hard
    if (flags.STRIPE === '1') warn('Stripe flag ON in client. Ensure you add a serverless API proxy (/api/create-checkout-session).')
    if (flags.OPENAI === '1') warn('OpenAI flag ON in client. Ensure you add a serverless API proxy (/api/generate).')

    ok('web/.env checks complete')
  }

  // supabase client file
  if (exists('web/src/lib/supabaseClient.js') || exists('web/src/lib/supabaseClient.ts')) {
    ok('Supabase
