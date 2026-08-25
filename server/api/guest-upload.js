import crypto from "node:crypto";
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;
function ip(req){return String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].trim();}
function limited(key){const now=Date.now();const c=attempts.get(key);if(!c||now-c.startedAt>=WINDOW_MS){attempts.set(key,{startedAt:now,count:1});return false;}c.count+=1;return c.count>MAX_ATTEMPTS;}
function sameOrigin(req){const o=req.headers.origin;if(!o)return true;try{return new URL(o).host===String(req.headers.host||"");}catch{return false;}}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"});
  if(!sameOrigin(req))return res.status(403).json({ok:false,error:"Forbidden"});
  if(limited(ip(req)))return res.status(429).json({ok:false,error:"Too many uploads. Please wait."});
  const body=req.body||{};
  const event=typeof body.event==="string"?body.event.trim():"";
  const name=typeof body.name==="string"?body.name.trim():"Guest";
  const filename=typeof body.filename==="string"?body.filename.trim():"photo.jpg";
  const mime=typeof body.mime==="string"?body.mime:"";
  const data=typeof body.data==="string"?body.data:"";
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event)||name.length<1||name.length>80||!/^image\/(jpeg|png|webp)$/.test(mime)||!data)return res.status(400).json({ok:false,error:"Invalid upload."});
  const raw=Buffer.from(data.replace(/^data:[^;]+;base64,/,""),"base64");
  if(!raw.length||raw.length>2_500_000)return res.status(400).json({ok:false,error:"Please upload an image smaller than 2.5 MB."});
  const url=(process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!url||!key)return res.status(503).json({ok:false,error:"Guest uploads are not configured."});
  const safe=filename.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-80);
  const path=`${event}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
  try{
    const r=await fetch(`${url}/storage/v1/object/wedding-guest-uploads/${encodeURIComponent(path).replaceAll("%2F","/")}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":mime,"x-upsert":"false"},body:raw});
    if(!r.ok)return res.status(502).json({ok:false,error:"Unable to upload this photo."});
    return res.status(201).json({ok:true,path});
  }catch{return res.status(500).json({ok:false,error:"Unable to upload this photo."});}
};
