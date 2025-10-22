export async function verifyTurnstile(token){
  try { const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ response: token, secret: process.env.TURNSTILE_SECRET }) });
    const j = await r.json(); return !!j.success;
  } catch(e){ console.warn("[turnstile] WARN:", e.message||e); return false; }
}
