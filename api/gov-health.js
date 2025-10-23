export default async function handler(_req,res){
  const urls=[process.env.GOV_URL_ICPPLUS,process.env.GOV_URL_SEDE_EXTRANJERIA,process.env.GOV_URL_REC,process.env.GOV_URL_CLAVE,process.env.GOV_URL_FNMT].filter(Boolean);
  const results=[]; for(const url of urls){ try{const r=await fetch(url); results.push({url,status:r.status})}catch{results.push({url,status:"unreachable"})} }
  return res.status(200).json({ ok:true, results });
}
