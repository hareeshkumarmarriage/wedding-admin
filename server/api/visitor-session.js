import crypto from "node:crypto";
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const SERVICE=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const COOKIE='wedding_visitor_token';
function json(res,s,b){res.status(s).setHeader('Content-Type','application/json');res.end(JSON.stringify(b));}
function info(req){const ua=String(req.headers['user-agent']||'Unknown');const os=/android/i.test(ua)?'Android':/iphone|ipad|ipod/i.test(ua)?'iOS':/windows/i.test(ua)?'Windows':/mac/i.test(ua)?'macOS':/linux/i.test(ua)?'Linux':'Other';const browser=/edg\//i.test(ua)?'Edge':/chrome\//i.test(ua)?'Chrome':/firefox\//i.test(ua)?'Firefox':/safari\//i.test(ua)?'Safari':'Browser';return {ip:String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim(),device:`${os} · ${browser}`,ua};}
function cookie(req,name){const raw=String(req.headers.cookie||'');const match=raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${name}=`));return match?decodeURIComponent(match.slice(name.length+1)):'';}
function hash(value){return crypto.createHash('sha256').update(value,'utf8').digest('hex');}
function token(){return crypto.randomBytes(32).toString('base64url');}
function secureFlag(req){const proto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim().toLowerCase();const host=String(req.headers.host||'').toLowerCase();const local=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);return (proto==='https'||(!proto&&req.socket?.encrypted))&&!local?'; Secure':'';}
export default async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'POST required.'});
    if(!SUPABASE_URL||!SERVICE)return json(res,503,{ok:false,error:'Visitor tracking is not configured.'});
    const body=req.body||{}; const action=String(body.action||'');
    const adminToken=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const adminHeaders={apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json'};
    if(action==='block'){
      if(!adminToken)return json(res,401,{ok:false,error:'Admin authorization required.'});
      const ar=await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`,{method:'POST',headers:{apikey:SERVICE,Authorization:`Bearer ${adminToken}`,'Content-Type':'application/json'},body:'{}'});
      if(!ar.ok||!(await ar.json()))return json(res,401,{ok:false,error:'Admin authorization required.'});
      const id=String(body.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return json(res,400,{ok:false,error:'Visitor ID is required.'});
      const r=await fetch(`${SUPABASE_URL}/rest/v1/visitor_sessions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{...adminHeaders,Prefer:'return=representation'},body:JSON.stringify({blocked:Boolean(body.blocked)})});
      const text=await r.text();if(!r.ok)return json(res,r.status,{ok:false,error:text});return json(res,200,{ok:true});
    }
    const {device_id,visitor_name}=body;
    if(!/^[A-Za-z0-9._:-]{8,120}$/.test(String(device_id||'')))return json(res,400,{ok:false,error:'Invalid device ID.'});
    if(!String(visitor_name||'').trim())return json(res,400,{ok:false,error:'Name is required.'});
    const i=info(req); const existingToken=cookie(req,COOKIE); const tokenHash=existingToken?hash(existingToken):''; const ipHash=hash(i.ip||'unknown');
    let existing=[];
    if(tokenHash) existing=await fetch(`${SUPABASE_URL}/rest/v1/visitor_sessions?visitor_token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,blocked&limit=1`,{headers:adminHeaders}).then(x=>x.ok?x.json():[]);
    if(!existing.length) existing=await fetch(`${SUPABASE_URL}/rest/v1/visitor_sessions?device_id=eq.${encodeURIComponent(device_id)}&select=id,blocked&limit=1`,{headers:adminHeaders}).then(x=>x.ok?x.json():[]);
    if(existing?.[0]?.blocked)return json(res,200,{ok:true,blocked:true});
    const visitorToken=existingToken||token(); const newHash=hash(visitorToken);
    const payload={visitor_token_hash:newHash,device_id,visitor_name:String(visitor_name).trim().slice(0,80),role:'visitor',ip_address:i.ip,ip_hash:ipHash,device:i.device,user_agent:i.ua,last_seen_at:new Date().toISOString()};
    const r=await fetch(`${SUPABASE_URL}/rest/v1/visitor_sessions?on_conflict=device_id`,{method:'POST',headers:{...adminHeaders,Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
    const d=await r.text();if(!r.ok)return json(res,r.status,{ok:false,error:d});
    if(!existingToken)res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(visitorToken)}; Path=/; Max-Age=31536000; HttpOnly${secureFlag(req)}; SameSite=Lax`);
    return json(res,200,{ok:true,blocked:false});
  }catch(e){return json(res,500,{ok:false,error:e.message||'Visitor session failed.'});}
}
