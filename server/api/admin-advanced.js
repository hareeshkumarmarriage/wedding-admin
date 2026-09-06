const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function json(res,status,body){res.status(status).setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.end(JSON.stringify(body));}
function authHeaders(token=SERVICE){return {apikey:SERVICE,Authorization:`Bearer ${token}`, 'Content-Type':'application/json'};}
async function supa(path,opts={}){const r=await fetch(`${SUPABASE_URL}${path}`,{...opts,headers:{...authHeaders(),...(opts.headers||{})}});const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{data=text;}if(!r.ok)throw new Error(data?.message||data?.msg||data?.error||text||`Supabase ${r.status}`);return data;}
async function userForToken(token){if(!SUPABASE_URL||!SERVICE||!token)return null;const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(token)});return r.ok?r.json():null;}
async function adminForToken(token){const u=await userForToken(token);if(!u?.id)return null;const rows=await supa(`/rest/v1/profiles?id=eq.${encodeURIComponent(u.id)}&select=id,role,username,display_name&limit=1`);return rows[0]?.role==='admin'?{...u,profile:rows[0]}:null;}
function revisionId(value){const id=String(value||'').trim();return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)?id:null;}
async function snapshot(){
  const [settings,sections,events]=await Promise.all([
    supa('/rest/v1/site_settings?select=key,value,updated_at&order=key.asc'),
    supa('/rest/v1/homepage_sections?select=key,label,enabled,sort_order,updated_at&order=sort_order.asc'),
    supa('/rest/v1/events?select=id,slug,title,date,description,cover_image,cover_image_drive_id,drive_folder_id,photos_drive_folder_id,photos_drive_folder_id_2,videos_drive_folder_id,videos_drive_folder_id_2,sort_order,is_active,photos_enabled,videos_enabled,slideshow_enabled,qr_enabled,venue_name,venue_address,maps_url,created_at,updated_at&order=sort_order.asc')
  ]);
  return {schema:1,created_at:new Date().toISOString(),site_settings:settings,homepage_sections:sections,events};
}
async function activity(admin,action,entityType=null,entityId=null,details={}){try{await supa('/rest/v1/admin_activity',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({admin_id:admin.id,action,entity_type:entityType,entity_id:entityId,details})});}catch(e){console.warn('admin activity:',e.message);}}
async function createRevision(admin,label='Draft',snapshotData=null){
  const data=snapshotData || await snapshot();
  const rows=await supa('/rest/v1/admin_revisions',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'draft',label:label||'Draft',snapshot:data,created_by:admin.id})});
  const revision=Array.isArray(rows)?rows[0]:rows;
  await activity(admin,'create_draft','revision',revision?.id,{label});
  return revision;
}
async function applySnapshot(snapshotData){
  if(!snapshotData || snapshotData.schema !== 1) throw new Error('Unsupported revision snapshot.');
  const settings=Array.isArray(snapshotData.site_settings)?snapshotData.site_settings:[];
  const sections=Array.isArray(snapshotData.homepage_sections)?snapshotData.homepage_sections:[];
  const events=Array.isArray(snapshotData.events)?snapshotData.events:[];
  const currentEvents=await supa('/rest/v1/events?select=id');
  const wantedEventIds=new Set(events.map(row=>String(row?.id||'')));
  for(const row of settings){if(!row?.key)continue;await supa(`/rest/v1/site_settings?key=eq.${encodeURIComponent(row.key)}`,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({key:row.key,value:row.value,updated_at:new Date().toISOString()})});}
  for(const row of sections){if(!row?.key)continue;await supa(`/rest/v1/homepage_sections?key=eq.${encodeURIComponent(row.key)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({label:row.label,enabled:row.enabled,sort_order:row.sort_order,updated_at:new Date().toISOString()})});}
  for(const row of events){
    if(!row?.id)continue;
    const {id,created_at,...patch}=row;
    await supa(`/rest/v1/events?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});
  }
  for(const row of currentEvents){if(row?.id && !wantedEventIds.has(String(row.id))) await supa(`/rest/v1/events?id=eq.${encodeURIComponent(row.id)}`,{method:'DELETE'});}
}
async function setPublishedSnapshot(revisionIdValue,snapshotData){
  await supa('/rest/v1/admin_published_snapshot?id=eq.true',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({snapshot:snapshotData,revision_id:revisionIdValue,updated_at:new Date().toISOString()})});
}

export default async function handler(req,res){
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
    const admin=await adminForToken(token);
    if(!admin)return json(res,401,{ok:false,error:'Admin authorization required.'});
    const action=String(req.query?.action||(req.body||{}).action||'status');
    const readActions=new Set(['snapshot','versions','version','activity','health','prelaunch','status']);
    const writeActions=new Set(['draft','publish','rollback','discard']);
    if((writeActions.has(action)&&req.method!=='POST')||(readActions.has(action)&&req.method!=='GET')){
      res.setHeader('Allow',writeActions.has(action)?'POST':'GET');
      return json(res,405,{ok:false,error:'Method not allowed.'});
    }

    if(action==='snapshot')return json(res,200,{ok:true,snapshot:await snapshot()});
    if(action==='draft')return json(res,200,{ok:true,revision:await createRevision(admin,(req.body||{}).label||'Draft')});
    if(action==='versions'){
      const rows=await supa('/rest/v1/admin_revision_summary?select=*&order=created_at.desc&limit=100');
      return json(res,200,{ok:true,versions:rows});
    }
    if(action==='version'){
      const id=revisionId(req.query?.id);if(!id)return json(res,400,{ok:false,error:'Valid revision ID is required.'});
      const rows=await supa(`/rest/v1/admin_revisions?id=eq.${encodeURIComponent(id)}&select=id,version_no,status,label,snapshot,created_by,created_at,published_at&limit=1`);
      if(!rows[0])return json(res,404,{ok:false,error:'Revision not found.'});
      return json(res,200,{ok:true,revision:rows[0]});
    }
    if(action==='publish'){
      let id=revisionId((req.body||{}).id);
      let revision=null;
      if(id){const rows=await supa(`/rest/v1/admin_revisions?id=eq.${encodeURIComponent(id)}&select=id,version_no,status,label,snapshot&limit=1`);revision=rows[0]||null;}
      if(!revision)revision=await createRevision(admin,(req.body||{}).label||`Publish ${new Date().toLocaleString()}`);
      await applySnapshot(revision.snapshot);
      await setPublishedSnapshot(revision.id,revision.snapshot);
      await supa(`/rest/v1/admin_revisions?id=eq.${encodeURIComponent(revision.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'published',published_at:new Date().toISOString()})});
      await supa('/rest/v1/admin_publish_history',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({revision_id:revision.id,action:'publish',published_by:admin.id})});
      await activity(admin,'publish','revision',revision.id,{version_no:revision.version_no,label:revision.label});
      return json(res,200,{ok:true,message:'Draft published successfully.',revision_id:revision.id,version_no:revision.version_no});
    }
    if(action==='rollback'){
      const id=revisionId((req.body||{}).id);if(!id)return json(res,400,{ok:false,error:'Valid revision ID is required.'});
      const rows=await supa(`/rest/v1/admin_revisions?id=eq.${encodeURIComponent(id)}&select=id,version_no,status,label,snapshot&limit=1`);const revision=rows[0];
      if(!revision)return json(res,404,{ok:false,error:'Revision not found.'});
      await applySnapshot(revision.snapshot);
      const draft=await createRevision(admin,`Rollback draft from Version ${revision.version_no}`,revision.snapshot);
      await activity(admin,'rollback_draft','revision',draft.id,{source_revision_id:id,source_version_no:revision.version_no});
      return json(res,200,{ok:true,message:'Rollback prepared as a draft. Preview it, then publish when ready.',revision_id:draft.id,version_no:draft.version_no});
    }
    if(action==='discard'){
      const rows=await supa('/rest/v1/admin_published_snapshot?id=eq.true&select=snapshot,revision_id&limit=1');
      const published=rows[0];if(!published?.snapshot)return json(res,409,{ok:false,error:'No published snapshot is available.'});
      await applySnapshot(published.snapshot);
      const draft=await createRevision(admin,'Draft reset to current published version',published.snapshot);
      await activity(admin,'discard_draft','revision',draft.id,{published_revision_id:published.revision_id});
      return json(res,200,{ok:true,message:'Draft reset to the current published version.',revision_id:draft.id});
    }
    if(action==='activity'){
      const rows=await supa('/rest/v1/admin_activity?select=*&order=created_at.desc&limit=200');
      return json(res,200,{ok:true,activity:rows});
    }
    if(action==='health'){
      const checks=[];for(const [name,path] of [['site_settings','/rest/v1/site_settings?select=key&limit=1'],['homepage_sections','/rest/v1/homepage_sections?select=key&limit=1'],['events','/rest/v1/events?select=id&limit=1'],['admin_revisions','/rest/v1/admin_revisions?select=id&limit=1'],['published_snapshot','/rest/v1/admin_published_snapshot?select=id&limit=1']]){try{await supa(path);checks.push({name,status:'ok'});}catch(e){checks.push({name,status:'error',message:e.message});}}
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
    if(action==='status')return json(res,200,{ok:true,status:'ready'});
    return json(res,400,{ok:false,error:'Unknown admin advanced action.'});
  }catch(e){console.error('[admin-advanced]',e);return json(res,500,{ok:false,error:'Admin advanced operation failed.'});}
}