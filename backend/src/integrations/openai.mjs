export async function aiComplete(prompt){
  try { const { default: OpenAI } = await import("openai"); const client=new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r= await client.chat.completions.create({ model:"gpt-4o-mini", messages:[{role:"user",content:String(prompt).slice(0,1500)}], temperature:0.2, max_tokens:400 }); 
    return r.choices?.[0]?.message?.content || "";
  } catch(e){ console.warn("[openai] WARN:", e.message||e); return ""; }
}
