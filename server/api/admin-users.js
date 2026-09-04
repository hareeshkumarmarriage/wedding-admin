const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(JSON.stringify(body));
}
function headers(token) { return { apikey: SERVICE, Authorization: `Bearer ${token || SERVICE}`, 'Content-Type':'application/json' }; }
async function authenticatedUser(token) {
  if (!SUPABASE_URL || !SERVICE || !token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(token) });
  return r.ok ? r.json() : null;
}
async function adminCheck(token) {
  const user = await authenticatedUser(token);
  if (!user?.id) return false;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`, { headers: headers() });
  if (!r.ok) return false;
  const rows = await r.json();
  return rows[0]?.role === 'admin';
}
function userInfo(req) {
  const ua = String(req.headers['user-agent'] || 'Unknown').slice(0, 512);
  const rawIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '');
  const ip = rawIp.split(',')[0].trim().slice(0, 128);
  const device = /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Other';
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome\//i.test(ua) ? 'Chrome' : /firefox\//i.test(ua) ? 'Firefox' : /safari\//i.test(ua) ? 'Safari' : 'Browser';
  return { ip, device: `${device} · ${browser}`, userAgent: ua };
}
async function supa(path, opts={}) {
  const r=await fetch(`${SUPABASE_URL}${path}`,{...opts,headers:{...headers(),...(opts.headers||{})}});
  const text=await r.text();
  let data={}; try{data=text?JSON.parse(text):{}}catch{}
  if(!r.ok) throw new Error(data?.msg||data?.message||text||`Supabase ${r.status}`);
  return data;
}
function validEmail(value) {
  const email = String(value || '').trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function cleanText(value, max=200) { return String(value ?? '').trim().slice(0, max); }

export default async function handler(req,res){
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow','POST');
      return json(res,405,{ok:false,error:'Method not allowed.'});
    }
    const token = String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
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
      const normalizedEmail = validEmail(email);
      if(!normalizedEmail||typeof password!=='string'||password.length<8||password.length>128) return json(res,400,{ok:false,error:'A valid email and a password of 8-128 characters are required.'});
      const u=await supa('/auth/v1/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:normalizedEmail,password,email_confirm:true})});
      try {
        await supa('/rest/v1/profiles',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:u.id,username:cleanText(username,100)||normalizedEmail.split('@')[0],display_name:cleanText(display_name,200),role:role==='admin'?'admin':'guest',updated_at:new Date().toISOString()})});
      } catch (profileError) {
        try { await supa(`/auth/v1/admin/users/${encodeURIComponent(u.id)}`,{method:'DELETE'}); } catch (cleanupError) { console.error('Admin user profile rollback cleanup failed', cleanupError); }
        throw profileError;
      }
      return json(res,200,{ok:true,id:u.id});
    }

    const id=cleanText((req.body||{}).id || req.query?.id, 128);
    if(action==='update'){
      if(!id) return json(res,400,{ok:false,error:'User ID is required.'});
      const {email,password,username,display_name,role}=req.body||{};
      const currentUser=await authenticatedUser(token);
      if(!currentUser?.id)return json(res,401,{ok:false,error:'Invalid admin session.'});
      const requestedRole=role==='admin'?'admin':'guest';
      if(password !== undefined && (typeof password !== 'string' || password.length<8 || password.length>128))return json(res,400,{ok:false,error:'Password must be 8-128 characters.'});
      if(id===currentUser.id && requestedRole!=='admin')return json(res,400,{ok:false,error:'You cannot demote your own active admin account.'});
      const profiles=await supa('/rest/v1/profiles?select=id,role');
      const adminCount=(profiles||[]).filter(p=>p.role==='admin').length;
      const target=(profiles||[]).find(p=>p.id===id);
      if(!target)return json(res,404,{ok:false,error:'User profile not found.'});
      if(target.role==='admin' && requestedRole!=='admin' && adminCount<=1)return json(res,400,{ok:false,error:'The last administrator cannot be demoted.'});
      const patch={};
      if(email !== undefined) {
        const normalizedEmail=validEmail(email);
        if(!normalizedEmail)return json(res,400,{ok:false,error:'A valid email is required.'});
        patch.email=normalizedEmail;
      }
      if(password)patch.password=password;
      if(Object.keys(patch).length) await supa(`/auth/v1/admin/users/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(patch)});
      await supa(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({username:cleanText(username,100),display_name:cleanText(display_name,200),role:requestedRole,updated_at:new Date().toISOString()})});
      return json(res,200,{ok:true});
    }

    if(action==='delete'){
      if(!id) return json(res,400,{ok:false,error:'User ID is required.'});
      const currentUser=await authenticatedUser(token);
      if(currentUser?.id===id)return json(res,400,{ok:false,error:'You cannot delete your own active admin account.'});
      const profiles=await supa('/rest/v1/profiles?select=id,role');
      const adminCount=(profiles||[]).filter(p=>p.role==='admin').length;
      const target=(profiles||[]).find(p=>p.id===id);
      if(!target)return json(res,404,{ok:false,error:'User profile not found.'});
      if(target.role==='admin' && adminCount<=1)return json(res,400,{ok:false,error:'The last administrator cannot be deleted.'});
      await supa(`/auth/v1/admin/users/${encodeURIComponent(id)}`,{method:'DELETE'});
      return json(res,200,{ok:true});
    }

    if(action==='session'){
      const info=userInfo(req);
      const authUser=await authenticatedUser(token);
      if(!authUser?.id) return json(res,401,{ok:false,error:'Invalid session.'});
      const profiles=await supa(`/rest/v1/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=username,role`);
      const p=profiles[0]||{};
      await supa('/rest/v1/admin_sessions',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:authUser.id,username:cleanText(p.username||authUser.email,100),role:p.role==='admin'?'admin':'guest',ip_address:info.ip,device:info.device,user_agent:info.userAgent,last_seen_at:new Date().toISOString()})});
      return json(res,200,{ok:true,session_id:(await supa(`/rest/v1/admin_sessions?user_id=eq.${encodeURIComponent(authUser.id)}&select=id&order=created_at.desc&limit=1`))[0]?.id || null});
    }

    if(action==='list_sessions'){
      const sessions=await supa('/rest/v1/admin_sessions?select=*&revoked_at=is.null&order=last_seen_at.desc&limit=100');
      return json(res,200,{ok:true,sessions});
    }

    if(action==='heartbeat' || action==='check_session'){
      const checkId=cleanText(req.query?.id || (req.body||{}).id, 128);
      if(!checkId)return json(res,400,{ok:false,error:'Session ID required.'});
      const authUser=await authenticatedUser(token);
      if(!authUser?.id)return json(res,401,{ok:false,error:'Invalid admin session.'});
      const rows=await supa(`/rest/v1/admin_sessions?id=eq.${encodeURIComponent(checkId)}&user_id=eq.${encodeURIComponent(authUser.id)}&select=id,user_id,revoked_at,last_seen_at&limit=1`);
      if(!rows[0])return json(res,404,{ok:false,error:'Session not found.'});
      if(action==='check_session') return json(res,200,{ok:true,revoked:!!rows[0].revoked_at});
      if(rows[0].revoked_at)return json(res,200,{ok:true,revoked:true});
      await supa(`/rest/v1/admin_sessions?id=eq.${encodeURIComponent(checkId)}&user_id=eq.${encodeURIComponent(authUser.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_seen_at:new Date().toISOString()})});
      return json(res,200,{ok:true,revoked:false});
    }

    if(action==='force_logout'){
      if(!id) return json(res,400,{ok:false,error:'Session ID required.'});
      const rows=await supa(`/rest/v1/admin_sessions?id=eq.${encodeURIComponent(id)}&select=id,user_id,revoked_at&limit=1`);
      if(!rows[0])return json(res,404,{ok:false,error:'Session not found.'});
      if(rows[0].revoked_at)return json(res,200,{ok:true,already_revoked:true});
      await supa(`/auth/v1/admin/users/${encodeURIComponent(rows[0].user_id)}`,{method:'PUT',body:JSON.stringify({user_metadata:{force_logout_at:new Date().toISOString()}})});
      await supa(`/rest/v1/admin_sessions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({revoked_at:new Date().toISOString()})});
      return json(res,200,{ok:true});
    }

    return json(res,400,{ok:false,error:'Unknown action.'});
  } catch(e){
    console.error('Admin user operation failed', e);
    return json(res,500,{ok:false,error:'Admin user operation failed.'});
  }
}
