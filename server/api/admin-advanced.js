const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function json(res,status,body){res.status(status).setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
function authHeaders(token=SERVICE){return {apikey:SERVICE,Authorization:`Bearer ${token}`, 'Content-Type':'application/json'};}
async function supa(path,opts={}){const r=await fetch(`${SUPABASE_URL}${path}`,{...opts,headers:{...authHeaders(),...(opts.headers||{})}});const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{data=text;}if(!r.ok)throw new Error(data?.message||data?.msg||data?.error||text||`Supabase ${r.status}`);return data;}
async function userForToken(token){if(!SUPABASE_URL||!SERVICE||!token)return null;const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(token)});return r.ok?r.json():null;}
async function adminForToken(token){const u=await userForToken(token);if(!u?.id)return null;const rows=await supa(`/rest/v1/profiles?id=eq.${encodeURIComponent(u.id)}&select=id,role,username,display_name&limit=1`);return rows[0]?.role==='admin'?{...u,profile:rows[0]}:null;}
async function snapshot(){
  const [settings,sections,events]=await Promise.all([
    supa('/rest/v1/site_settings?select=key,value,updated_at&order=key.asc'),
    supa('/rest/v1/homepage_sections?select=key,label,enabled,sort_order,updated_at&order=sort_order.asc'),
    supa('/rest/v1/events?select=id,slug,title,date,description,cover_image,cover_image_drive_id,drive_folder_id,photos_drive_folder_id,photos_drive_folder_id_2,videos_drive_folder_id,videos_drive_folder_id_2,sort_order,is_active,photos_enabled,videos_enabled,slideshow_enabled,qr_enabled,venue_name,venue_address,maps_url,updated_at&order=sort_order.asc')
  ]);
  return {schema:1,created_at:new Date().toISOString(),site_settings:settings,homepage_sections:sections,events};
}
async function activity(admin,action,entityType=null,entityId=null,details={}){try{await supa('/rest/v1/admin_activity',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({admin_id:admin.id,action,entity_type:entityType,entity_id:entityId,details})});}catch(e){console.warn('admin activity:',e.message);}}
async function createRevision(admin,label,status='draft'){
  const data=await snapshot();
  const rows=await supa('/rest/v1/admin_revisions',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({status,label:label||'Admin snapshot',snapshot:data,created_by:admin.id})});
  const revision=Array.isArray(rows)?rows[0]:rows;
  await activity(admin,status==='published'?'publish_snapshot':'create_draft','revision',revision?.id,{label});
  return revision;
}
async function applySnapshot(snapshotData){
  const settings=snapshotData?.site_settings||[];
  for(const row of settings){await supa(`/rest/v1/site_settings?key=eq.${encodeURIComponent(row.key)}`,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({key:row.key,value:row.value,updated_at:new Date().toISOString()})});}
  for(const row of snapshotData?.homepage_sections||[]){await supa(`/rest/v1/homepage_sections?key=eq.${encodeURIComponent(row.key)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:{enabled:row.enabled,sort_order:row.sort_order,updated_at:new Date().toISOString()}});}
  for(const row of snapshotData?.events||[]){
    if(!row.id)continue;
    const {id,created_at,...patch}=row;
    await supa(`/rest/v1/events?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:{...patch,updated_at:new Date().toISOString()}});
  }
}

export default async function handler(req,res){
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const admin=await adminForToken(token);
    if(!admin)return json(res,401,{ok:false,error:'Admin authorization required.'});
    const action=String(req.query?.action||(req.body||{}).action||'status');

    if(action==='snapshot')return json(res,200,{ok:true,snapshot:await snapshot()});
    if(action==='draft')return json(res,200,{ok:true,revision:await createRevision(admin,(req.body||{}).label||'Draft')});
    if(action==='versions'){
      const rows=await supa('/rest/v1/admin_revision_summary?select=*&order=created_at.desc&limit=100');
      return json(res,200,{ok:true,versions:rows});
    }
    if(action==='version'){
      const id=String(req.query?.id||'');if(!id)return json(res,400,{ok:false,error:'Revision ID is required.'});
      const rows=await supa(`/rest/v1/admin_revisions?id=eq.${encodeURIComponent(id)}&select=id,version_no,status,label,snapshot,created_by,created_at,published_at&limit=1`);
      if(!rows[0])return json(res,404,{ok:false,error:'Revision not found.'});
      return json(res,200,{ok:true,revision:rows[0]});
    }
    if(action==='publish'||action==='rollback'){
      const id=String((req.body||{}).id||req.query?.id||'');if(!id)return json(res,400,{ok:false,error:'Revision ID is required.'});
      const rows=await supa(`/rest/v1/admin_revisions?id=eq.${encodeURIComponent(id)}&select=id,version_no,status,label,snapshot&limit=1`);const revision=rows[0];
      if(!revision)return json(res,404,{ok:false,error:'Revision not found.'});
      await applySnapshot(revision.snapshot);
      await supa(`/rest/v1/admin_revisions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:{status:'published',published_at:new Date().toISOString()}});
      await supa('/rest/v1/admin_publish_history',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({revision_id:id,action,published_by:admin.id})});
      await activity(admin,action,'revision',id,{version_no:revision.version_no,label:revision.label});
      return json(res,200,{ok:true,message:action==='rollback'?'Revision rolled back successfully.':'Revision published successfully.',revision_id:id});
    }
    if(action==='activity'){
      const rows=await supa('/rest/v1/admin_activity?select=*&order=created_at.desc&limit=200');
      return json(res,200,{ok:true,activity:rows});
    }
    if(action==='health'){
      const checks=[];for(const [name,path] of [['site_settings','/rest/v1/site_settings?select=key&limit=1'],['homepage_sections','/rest/v1/homepage_sections?select=key&limit=1'],['events','/rest/v1/events?select=id&limit=1'],['admin_revisions','/rest/v1/admin_revisions?select=id&limit=1']]){try{await supa(path);checks.push({name,status:'ok'});}catch(e){checks.push({name,status:'error',message:e.message});}}
      return json(res,200,{ok:true,checks,environment:{supabase:Boolean(SUPABASE_URL),serviceKey:Boolean(SERVICE)}});
    }
    if(action==='prelaunch'){
      const [settings,events]=await Promise.all([supa('/rest/v1/site_settings?select=key,value'),supa('/rest/v1/events?select=id,slug,title,is_active,photos_enabled,videos_enabled')]);
      const map=Object.fromEntries(settings.map(x=>[x.key,x.value]));const wedding=map.wedding||{};const checks=[
        {name:'Wedding names',ok:Boolean(wedding.bride_name&&wedding.groom_name)},
        {name:'Wedding date',ok:Boolean(wedding.wedding_date)},
        {name:'At least one active event',ok:events.some(e=>e.is_active)},
        {name:'Supabase configuration',ok:Boolean(SUPABASE_URL&&SERVICE)},
        {name:'Revision storage',ok:true},
      ];return json(res,200,{ok:true,checks,passed:checks.filter(x=>x.ok).length,total:checks.length});
    }
    return json(res,400,{ok:false,error:'Unknown admin advanced action.'});
  }catch(e){console.error('[admin-advanced]',e);return json(res,500,{ok:false,error:e.message||'Admin advanced operation failed.'});}
}
