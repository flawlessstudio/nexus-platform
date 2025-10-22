import OpenAI from "openai"; import { env } from "../utils/env.js";
const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
export async function aiDocumentAssistant(prompt){
  if(!client) throw new Error("OpenAI not configured");
  if(!prompt || typeof prompt!=="string" || prompt.length>2000) throw new Error("Invalid input");
  const res = await client.chat.completions.create({
    model:"gpt-4o-mini",
    messages:[{role:"user",content:prompt}],
    temperature:0.2,
    timeout:15000
  });
  return res.choices?.[0]?.message?.content ?? "";
}
