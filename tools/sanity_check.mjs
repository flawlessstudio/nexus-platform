import fs from 'node:fs'
import path from 'node:path'
const CWD = process.cwd()
const W = (p) => path.join(CWD, p)
const exists = (p) => fs.existsSync(W(p))
const read = (p) => fs.readFileSync(W(p), 'utf8')
let ERR=0, WARN=0
const ok=(m)=>console.log('✔',m)
const warn=(m)=>{WARN++;console.log('⚠',m)}
const err=(m)=>{ERR++;console.log('✖',m)}
ok('NEXUS Sanity — start')
;['web','backend','supabase','.github/workflows'].forEach(d=>exists(d)?ok('Found '+d+'/'):err('Missing '+d+'/'))
if (!exists('web/vercel.json')) err('Missing web/vercel.json')
else { try { const v=JSON.parse(read('web/vercel.json')); const rw=Array.isArray(v.rewrites)&&v.rewrites.some(r=>r.destination==='/index.html'); rw?ok('web/vercel.json SPA rewrites OK'):err('web/vercel.json missing SPA rewrite') } catch(e){ err('web/vercel.json invalid JSON: '+e.message) } }
if (!exists('web/.env')) warn('web/.env missing (ok in CI)')
else { const e=read('web/.env'); if(!e.includes('VITE_SUPABASE_URL=')) err('web/.env missing VITE_SUPABASE_URL='); if(!e.includes('VITE_SUPABASE_ANON_KEY=')) err('web/.env missing VITE_SUPABASE_ANON_KEY='); const forb=['SUPABASE_SERVICE_ROLE_KEY=','OPENAI_API_KEY=','STRIPE_SECRET_KEY=','TURNSTILE_SECRET=']; const hits=forb.filter(k=>e.includes(k)); if(hits.length) err('Forbidden server secret(s) in web/.env: '+hits.join(', ')) }
if (exists('backend/.env')) { const e=read('backend/.env'); if(!e.includes('SUPABASE_URL=')) warn('backend/.env missing SUPABASE_URL='); if(!e.includes('SUPABASE_SERVICE_ROLE_KEY=')) warn('backend/.env missing SUPABASE_SERVICE_ROLE_KEY=') } else { warn('backend/.env missing (ok if backend not used locally)') }
exists('web/src/lib/supabaseClient.js')?ok('Supabase client found in web/src/lib'):err('Missing web/src/lib/supabaseClient.js')
if (exists('supabaseClient.js')||exists('supabaseAdmin.js')) warn('Root-level supabase client(s) still present — delete them')
exists('.github/workflows/build-check.yml')?ok('build-check.yml present'):err('Missing build-check.yml')
exists('.github/workflows/doctors.yml')?ok('doctors.yml present'):warn('doctors.yml missing')
console.log('\nSummary:',{errors:ERR,warnings:WARN}); if (ERR>0) process.exit(1)
