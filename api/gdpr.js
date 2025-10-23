export default async function handler(req,res){
  if(req.method==="GET") return res.status(200).json({ ok:true, user:null, data:{} });
  if(req.method==="POST") return res.status(200).json({ ok:true, scheduled:true });
  return res.status(405).json({ error:"Method not allowed" });
}
