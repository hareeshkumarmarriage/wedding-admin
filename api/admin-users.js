const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function json(res, status, body) { res.status(status).setHeader('Content-Type','application/json'); res.end(JSON.stringify(body)); }
function headers(token) { return { apikey: SERVICE, Authorization: `Bearer ${token || SERVICE}`, 'Content-Type':'application/json' }; }
async function adminCheck(token) {
  if (!SUPABASE_URL || !SERVICE || !token) return false;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method:'POST', headers: headers(token), body:'{}' });
  return r.ok && await r.json();
}
function userInfo(req) {
  const ua = String(req.headers['user-agent'] || 'Unknown');
  const device = /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Other';
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome\//i.test(ua) ? 'Chrome' : /firefox\//i.test(ua) ? 'Firefox' : /safari\//i.test(ua) ? 'Safari' : 'Browser';
  return { ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim(), device: `${device} · ${browser}`, userAgent: ua };
}
async function supa(path, opts={}) { const r=await fetch(`${SUPABASE_URL}${path}`,{...opts,headers:{...headers(),...(opts.headers||{})}}); const text=await r.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{} if(!r.ok) throw new Error(data?.msg||data?.message||text||`Supabase ${r.status}`); return data; }

export default async function handler(req,res){
  try {
    const token = String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!(await adminCheck(token))) return json(res,401,{ok:false,error:'Admin authorization required.'});
    const action=req.query?.action || (req.body||{}).action || 'list';
    if(action==='list'){
      const users=await supa('/auth/v1/admin/users?per_page=1000');
      const profiles=await supa('/rest/v1/profiles?select=id,username,display_name,role,created_at,updated_at');
      const byId=new Map((profiles||[]).map(p=>[p.id,p]));
      return json(res,200,{ok:true,users:(users.users||[]).map(u=>({id:u.id,email:u.email,username:byId.get(u.id)?.username||u.email?.split('@')[0]||'',display_name:byId.get(u.id)?.display_name||'',role:byId.get(u.id)?.role||'guest',created_at:u.created_at,last_sign_in_at:u.last_sign_in_at}))});
    }
    if(action==='create'){
      const {email,password,username,display_name,role='guest'}=req.body||{};
      if(!email||!password||String(password).length<8) return json(res,400,{ok:false,error:'Email and a password of at least 8 characters are required.'});
      const u=await supa('/auth/v1/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true})});
      await supa('/rest/v1/profiles',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:u.id,username:username||email.split('@')[0],display_name:display_name||'',role:role==='admin'?'admin':'guest',updated_at:new Date().toISOString()})});
      return json(res,200,{ok:true,id:u.id});
    }
    const id=String((req.body||{}).id||''); if(!id) return json(res,400,{ok:false,error:'User ID is required.'});
    if(action==='update'){
      const {email,password,username,display_name,role}=req.body||{};
      const patch={}; if(email)patch.email=email; if(password)patch.password=password;
      if(Object.keys(patch).length) await supa(`/auth/v1/admin/users/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(patch)});
      await supa(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({username,display_name,role:role==='admin'?'admin':'guest',updated_at:new Date().toISOString()})});
      return json(res,200,{ok:true});
    }
    if(action==='delete'){
      await supa(`/auth/v1/admin/users/${encodeURIComponent(id)}`,{method:'DELETE'});
      return json(res,200,{ok:true});
    }
    if(action==='session'){
      const info=userInfo(req);
      const authUser=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:headers(token)}).then(r=>r.ok?r.json():null);
      if(!authUser?.id) return json(res,401,{ok:false,error:'Invalid session.'});
      const profiles=await supa(`/rest/v1/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=username,role`);
      const p=profiles[0]||{};
      await supa('/rest/v1/admin_sessions',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:authUser.id,username:p.username||authUser.email,role:p.role||'admin',ip_address:info.ip,device:info.device,user_agent:info.userAgent,last_seen_at:new Date().toISOString()})});
      return json(res,200,{ok:true,session_id:(await supa(`/rest/v1/admin_sessions?user_id=eq.${encodeURIComponent(authUser.id)}&select=id&order=created_at.desc&limit=1`))[0]?.id || null});
    }
    return json(res,400,{ok:false,error:'Unknown action.'});
  } catch(e){ return json(res,500,{ok:false,error:e.message||'Admin user operation failed.'}); }
}
