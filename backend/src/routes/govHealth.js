const env=process.env;
export async function govHealthHandler(_req,res){
  const urls=[env.GOV_URL_ICPPLUS,env.GOV_URL_SEDE_EXTRANJERIA,env.GOV_URL_REC,env.GOV_URL_CLAVE,env.GOV_URL_FNMT].filter(Boolean);
  const results=[];
  for(const url of urls){ try{ const r=await fetch(url,{method:"GET"}); results.push({url,status:r.status}) } catch{ results.push({url,status:"unreachable"}) } }
  res.status(200).json({ok:true,results});
}
