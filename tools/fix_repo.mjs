// NEXUS Repo Fixer — makes your repo Vercel+Supabase-ready (frontend-only baseline)
// Run: node tools/fix_repo.mjs
// Requires: Node >= 20, git installed

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const CWD = process.cwd()
const W = (p) => path.join(CWD, p)
const exists = (p) => fs.existsSync(W(p))
const read = (p) => fs.readFileSync(W(p), 'utf8')
const write = (p, s) => {
  const full = W(p)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, s)
  log('WROTE', p)
}
const rmrf = (p) => {
  const full = W(p)
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true })
    log('DELETED', p)
  }
}
const log = (...m) => console.log('[fix]', ...m)
const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: CWD })

function ensureLineInFile(file, line) {
  const full = W(file)
  let body = exists(file) ? read(file) : ''
  if (!body.split(/\r?\n/).includes(line)) {
    body = (body.trimEnd() + '\n' + line + '\n').replace(/^\n+/, '')
    write(file, body)
  } else {
    log('OK   ', `${line} already in ${file}`)
  }
}

function safeGitRmCached(p) {
  try { run(`git rm -r --cached "${p}"`); } catch { /* ignore if not tracked */ }
}

function safeGitMv(from, to) {
  try { run(`git mv "${from}" "${to}"`); }
  catch {
    // fallback: manual move
    const src = W(from)
    const dst = W(to)
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      fs.renameSync(src, dst)
      log('MOVED', `${from} -> ${to}`)
      run(`git add "${to}"`)
      try { run(`git rm --cached "${from}"`) } catch {}
    }
  }
}

// 0) quick guard
if (!exists('package.json')) {
  console.error('Run this from the repo root (package.json not found).')
  process.exit(1)
}

// 1) Ignore and remove /.vercel
ensureLineInFile('.gitignore', '.vercel')
safeGitRmCached('.vercel')
rmrf('.vercel')

// 2) Kill root vercel.json; ensure web/vercel.json (SPA rewrite)
if (exists('vercel.json')) {
  try { run('git rm -f vercel.json') } catch { rmrf('vercel.json') }
}
const webVercel = `{
  "version": 2,
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
`
write('web/vercel.json', webVercel)
run('git add web/vercel.json')

// 3) Ensure web/src/lib/supabaseClient.js
const clientJs = `import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
`
if (!exists('web/src/lib/supabaseClient.js')) {
  write('web/src/lib/supabaseClient.js', clientJs)
  run('git add web/src/lib/supabaseClient.js')
} else {
  log('OK   ', 'web/src/lib/supabaseClient.js exists')
}

// 4) Move admin client to backend/lib (server-only) if found at root
if (exists('supabaseAdmin.js')) {
  fs.mkdirSync(W('backend/lib'), { recursive: true })
  safeGitMv('supabaseAdmin.js', 'backend/lib/supabaseAdmin.js')
}
ensureLineInFile('.gitignore', 'backend/.env')
ensureLineInFile('.gitignore', 'web/.env')
ensureLineInFile('.gitignore', 'supabase/.env')

// 5) Remove any root supabaseClient.js duplicates
if (exists('supabaseClient.js')) {
  try { run('git rm -f supabaseClient.js') } catch { rmrf('supabaseClient.js') }
}

// 6) Ensure pnpm-workspace.yaml is minimal (web + backend)
const workspaceYaml = `packages:
  - web
  - backend
`
write('pnpm-workspace.yaml', workspaceYaml)
run('git add pnpm-workspace.yaml')

// 7) Ensure root package.json has sanity scripts
try {
  const pkgPath = W('package.json')
  const pkg = JSON.parse(read('package.json'))
  pkg.scripts ||= {}
  pkg.scripts.sanity = pkg.scripts.sanity || 'node tools/sanity_check.mjs'
  pkg.scripts['sanity:strict'] = pkg.scripts['sanity:strict'] || 'node tools/sanity_check.mjs --strict'
  write('package.json', JSON.stringify(pkg, null, 2) + '\n')
  run('git add package.json')
} catch (e) {
  console.warn('[fix] Could not update package.json scripts:', e.message)
}

// 8) Ensure GitHub Actions exist
const buildCheck = `name: Build Check
on:
  push:
    branches: [ main ]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - name: Enable Corepack
        run: corepack enable
      - name: Install deps (monorepo)
        run: pnpm install --frozen-lockfile
      - name: Build web
        working-directory: web
        run: pnpm build
      - name: Sanity Doctor
        run: pnpm sanity:strict
`
write('.github/workflows/build-check.yml', buildCheck)
run('git add .github/workflows/build-check.yml')

const doctors = `name: Doctors
on:
  workflow_dispatch:
  push:
    branches: [ main ]
jobs:
  doctors:
    runs-on: ubuntu-latest
    env:
      CI: true
      SUPABASE_URL: https://example.supabase.co
      SUPABASE_ANON_KEY: placeholder
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - name: Enable Corepack
        run: corepack enable
      - name: Install deps
        run: pnpm install --frozen-lockfile
      - name: Run readiness doctor (no browser)
        run: node tools/readiness_doctor.mjs --open=false || true
      - name: Archive report (if any)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: readiness-report
          path: tools/*.html
          if-no-files-found: ignore
`
write('.github/workflows/doctors.yml', doctors)
run('git add .github/workflows/doctors.yml')

// 9) Ensure tools/sanity_check.mjs exists (deep validator)
const sanityMjs = `import fs from 'node:fs'
import path from 'node:path'
const CWD = process.cwd()
const W = (p) => path.join(CWD, p)
const exists = (p) => fs.existsSync(W(p))
const read = (p) => fs.readFileSync(W(p), 'utf8')
let ERR=0, WARN=0
const log=(t,m)=>console.log(t,m)
const ok=(m)=>log('✔',m)
const warn=(m)=>{WARN++;log('⚠',m)}
const err=(m)=>{ERR++;log('✖',m)}

ok('NEXUS Sanity — start')

// layout
;['web','backend','supabase','.github/workflows'].forEach(d=>{
  exists(d)?ok('Found '+d+'/'):err('Missing '+d+'/')
})

// vercel config
if (!exists('web/vercel.json')) err('Missing web/vercel.json')
else {
  try {
    const v = JSON.parse(read('web/vercel.json'))
    const rw = Array.isArray(v.rewrites) && v.rewrites.some(r=>r.destination==='/index.html')
    rw?ok('web/vercel.json SPA rewrites OK'):err('web/vercel.json missing SPA rewrite')
  } catch(e){ err('web/vercel.json invalid JSON: '+e.message) }
}

// envs
if (!exists('web/.env')) warn('web/.env missing (ok in CI)')
else {
  const e = read('web/.env')
  if (!e.includes('VITE_SUPABASE_URL=')) err('web/.env missing VITE_SUPABASE_URL=')
  if (!e.includes('VITE_SUPABASE_ANON_KEY=')) err('web/.env missing VITE_SUPABASE_ANON_KEY=')
  const forbidden = ['SUPABASE_SERVICE_ROLE_KEY=','OPENAI_API_KEY=','STRIPE_SECRET_KEY=','TURNSTILE_SECRET=']
  const hits = forbidden.filter(k=>e.includes(k))
  if (hits.length) err('Forbidden server secret(s) in web/.env: '+hits.join(', '))
}

if (exists('backend/.env')) {
  const e = read('backend/.env')
  if (!e.includes('SUPABASE_URL=')) warn('backend/.env missing SUPABASE_URL=')
  if (!e.includes('SUPABASE_SERVICE_ROLE_KEY=')) warn('backend/.env missing SUPABASE_SERVICE_ROLE_KEY=')
} else {
  warn('backend/.env missing (ok if backend not used locally)')
}

// clients
exists('web/src/lib/supabaseClient.js')?ok('Supabase client found in web/src/lib'):err('Missing web/src/lib/supabaseClient.js')
if (exists('supabaseClient.js')||exists('supabaseAdmin.js')) warn('Root-level supabase client(s) still present — delete them')

// workflows
exists('.github/workflows/build-check.yml')?ok('build-check.yml present'):err('Missing build-check.yml')
exists('.github/workflows/doctors.yml')?ok('doctors.yml present'):warn('doctors.yml missing')

// summary
console.log('\nSummary:', {errors:ERR, warnings:WARN})
if (ERR>0){ process.exit(1) }
`
if (!exists('tools/sanity_check.mjs')) {
  write('tools/sanity_check.mjs', sanityMjs)
  run('git add tools/sanity_check.mjs')
}

// 10) Final helpful ignores
ensureLineInFile('.gitignore', 'node_modules')
ensureLineInFile('.gitignore', 'dist')
run('git add .gitignore')

console.log('\n[fix] Done. Review changes, then commit & push:')
console.log('   git commit -m "chore: repo hygiene + Vercel/Supabase wiring"')
console.log('   git push')
