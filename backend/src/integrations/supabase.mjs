export async function supabaseClient(){
  try { const { createClient } = await import("@supabase/supabase-js");
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  } catch(e){ console.warn("[supabase] WARN:", e.message||e); return null; }
}
export async function dbGetUser(id){ const c = await supabaseClient(); if(!c) return null; const { data } = await c.from("users").select("*").eq("id",id).single(); return data||null; }
