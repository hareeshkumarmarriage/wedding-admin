import { useEffect, useState } from "react";
import { History, ShieldCheck, Users, X, RotateCcw, Rocket, Ban } from "lucide-react";
import AdminControlCenterV2 from "./AdminControlCenterV2";
import { supabaseRest } from "@/lib/supabase";
import { writeAdminAudit } from "@/lib/supabaseData";

const TOKEN_KEY = "wedding-admin-access-token";

type Revision = { id:string; version_no:number; status:string; label:string|null; created_by:string|null; created_at:string; published_at:string|null };
type Session = { id:string; user_id:string; username:string|null; role:string; device:string|null; last_seen_at:string; created_at:string; revoked_at:string|null };
type Profile = { id:string; role:string; username:string|null; display_name:string|null; updated_at:string|null };

function Btn({children,onClick,disabled=false,danger=false}:{children:any;onClick?:()=>void;disabled?:boolean;danger?:boolean}){return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium disabled:opacity-50 ${danger?"border-red-200 text-red-700 hover:bg-red-50":"bg-background hover:bg-muted"}`}>{children}</button>}
function Card({title,children}:{title:string;children:any}){return <section className="rounded-2xl border bg-card p-4"><h3 className="mb-3 font-semibold">{title}</h3>{children}</section>}

export default function AdminControlCenterV3(){
 const [open,setOpen]=useState(false);
 const [token]=useState(()=>sessionStorage.getItem(TOKEN_KEY)||"");
 const [revisions,setRevisions]=useState<Revision[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const notify=(s:string)=>{setMessage(s);window.setTimeout(()=>setMessage(""),3500)};
 const load=async()=>{if(!token)return;setBusy(true);try{
   const [r,s,p]=await Promise.all([
     supabaseRest<Revision[]>("admin_revision_summary",{token,query:"select=id,version_no,status,label,created_by,created_at,published_at&order=version_no.desc&limit=30"}),
     supabaseRest<Session[]>("rpc/admin_list_sessions",{token,method:"POST",body:{}}),
     supabaseRest<Profile[]>("profiles",{token,query:"select=id,role,username,display_name,updated_at&order=created_at.asc&limit=100"})
   ]);
   setRevisions(r||[]);setSessions(s||[]);setProfiles(p||[]);
 }catch(e){notify(e instanceof Error?e.message:"Unable to load management data")}finally{setBusy(false)}};
 useEffect(()=>{if(open)void load()},[open]);
 const publish=async()=>{setBusy(true);try{await supabaseRest<string>("rpc/admin_publish_revision",{token,method:"POST",body:{p_label:"Manual admin publish"}});await writeAdminAudit(token,"publish_revision");notify("New publish revision created.");await load()}catch(e){notify(e instanceof Error?e.message:"Publish failed")}finally{setBusy(false)}};
 const rollback=async(id:string)=>{if(!window.confirm("Roll back to this revision? The current state will be preserved as a revision before rollback."))return;setBusy(true);try{await supabaseRest<string>("rpc/admin_rollback_revision",{token,method:"POST",body:{p_revision_id:id}});await writeAdminAudit(token,"rollback_revision",id);notify("Rollback completed.");await load()}catch(e){notify(e instanceof Error?e.message:"Rollback failed")}finally{setBusy(false)}};
 const revoke=async(id:string)=>{if(!window.confirm("Revoke this admin session?"))return;setBusy(true);try{await supabaseRest<boolean>("rpc/admin_revoke_session",{token,method:"POST",body:{p_session_id:id}});await writeAdminAudit(token,"revoke_admin_session",id);notify("Session revoked.");await load()}catch(e){notify(e instanceof Error?e.message:"Session revoke failed")}finally{setBusy(false)}};
 const updateProfile=async(p:Profile)=>{const role=window.prompt("Role: admin, editor, or viewer",p.role);if(!role)return;const username=window.prompt("Username",p.username||"");if(username===null)return;const displayName=window.prompt("Display name",p.display_name||"");if(displayName===null)return;setBusy(true);try{await supabaseRest<boolean>("rpc/admin_update_profile",{token,method:"POST",body:{p_user_id:p.id,p_role:role,p_username:username,p_display_name:displayName}});await writeAdminAudit(token,"update_admin_profile",p.id);notify("Profile updated.");await load()}catch(e){notify(e instanceof Error?e.message:"Profile update failed")}finally{setBusy(false)}};
 return <><AdminControlCenterV2/><button type="button" onClick={()=>setOpen(true)} className="fixed bottom-5 left-5 z-[90] inline-flex min-h-11 items-center gap-2 rounded-full border bg-background px-4 text-sm font-semibold shadow-xl"><ShieldCheck size={17}/>Backend controls</button>{open&&<div className="fixed inset-0 z-[100] bg-black/40 p-3 md:p-8"><section className="ml-auto h-full w-full max-w-4xl overflow-y-auto rounded-3xl border bg-background p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Backend controls</h2><p className="text-sm text-muted-foreground">Publish revisions, rollback safely, manage sessions and admin profiles.</p></div><Btn onClick={()=>setOpen(false)}><X size={17}/></Btn></div><div className="grid gap-5 lg:grid-cols-2"><Card title="Publishing & rollback"><div className="mb-3 flex gap-2"><Btn onClick={()=>void publish()} disabled={busy}><Rocket size={15}/>Create publish revision</Btn><Btn onClick={()=>void load()} disabled={busy}>Refresh</Btn></div><div className="space-y-2">{revisions.length===0?<p className="text-sm text-muted-foreground">No revisions found.</p>:revisions.map(r=><div key={r.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-3"><div><b>Version {r.version_no}</b><div className="text-xs text-muted-foreground">{r.label||"Untitled"} · {new Date(r.created_at).toLocaleString()}</div></div><Btn onClick={()=>void rollback(r.id)} disabled={busy}><RotateCcw size={14}/>Rollback</Btn></div></div>)}</div></Card><Card title="Admin sessions"><div className="space-y-2">{sessions.length===0?<p className="text-sm text-muted-foreground">No sessions returned.</p>:sessions.map(s=><div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><b className="truncate">{s.username||"Unknown user"}</b><div className="text-xs text-muted-foreground">{s.role} · {s.device||"Unknown device"} · {new Date(s.last_seen_at).toLocaleString()}</div></div>{s.revoked_at?<span className="text-xs text-red-600">Revoked</span>:<Btn danger onClick={()=>void revoke(s.id)} disabled={busy}><Ban size={14}/>Revoke</Btn>}</div>)}</div></Card><Card title="Admin profiles"><div className="space-y-2">{profiles.length===0?<p className="text-sm text-muted-foreground">No profiles returned.</p>:profiles.map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><b>{p.display_name||p.username||p.id}</b><div className="text-xs text-muted-foreground">{p.username||"No username"} · {p.role}</div></div><Btn onClick={()=>void updateProfile(p)} disabled={busy}><Users size={14}/>Edit</Btn></div>)}</div></Card></div>{message&&<div role="status" className="fixed bottom-5 right-5 rounded-xl border bg-background p-3 text-sm shadow-xl">{message}</div>}</section></div>}</>;
}
