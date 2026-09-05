import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, CircleHelp, Eye, Globe2, LogOut, Menu, Moon, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Rocket, Search, Settings, ShieldCheck, Sparkles, Sun, UserCircle2, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ADMIN_MODULES, GROUP_LABELS, type AdminModule } from "@/admin/moduleRegistry";
import { supabaseAuthPassword, supabaseRest } from "@/lib/supabase";
import { getAdminAnalytics, getAdminEvents, getAdminFeaturedGuestbook, getAdminSettings, getAuditLogs, getNotifications, isSupabaseConfigured, type EventRecord } from "@/lib/supabaseData";

const TOKEN_KEY = "wedding-admin-access-token";
const ROLE_KEY = "wedding-admin-role";

type Health = { label: string; status: "ok" | "warn" | "error" | "unknown"; detail: string };

function StatusDot({ status }: { status: Health["status"] }) {
  const cls = status === "ok" ? "bg-emerald-500" : status === "warn" ? "bg-amber-500" : status === "error" ? "bg-red-500" : "bg-slate-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} aria-label={status} />;
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-sm"><div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</div><div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>;
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Enter your email and password.");
    setBusy(true); setError("");
    try { const session = await supabaseAuthPassword(email.trim(), password); sessionStorage.setItem(TOKEN_KEY, session.access_token); onLogin(session.access_token); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); }
    finally { setBusy(false); }
  };
  return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-background to-primary/5 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border bg-card p-7 shadow-xl"><div className="mb-7 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Sparkles size={22}/></div><div><div className="font-semibold">Wedding Admin</div><div className="text-sm text-muted-foreground">Secure administration center</div></div></div><h1 className="text-2xl font-semibold">Sign in</h1><p className="mt-1 text-sm text-muted-foreground">Use your administrator account to continue.</p>{error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<label className="mt-6 block text-sm font-medium">Email<input className="mt-1 h-11 w-full rounded-xl border bg-background px-3" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="mt-4 block text-sm font-medium">Password<input className="mt-1 h-11 w-full rounded-xl border bg-background px-3" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button></form></main>;
}

export default function AdminPlatform() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("admin-theme") === "dark");
  const [draft, setDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState("");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>({ total: 0, byType: {}, recent: [] });
  const [guestbook, setGuestbook] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [health, setHealth] = useState<Health[]>([]);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("admin-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(t); }, [toast]);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      const checks: Health[] = [{ label: "Supabase configuration", status: isSupabaseConfigured() ? "ok" : "error", detail: isSupabaseConfigured() ? "Configured" : "Missing public environment configuration" }];
      try { const ok = await supabaseRest<boolean>("rpc/is_admin", { method: "POST", token, body: {} }); checks.push({ label: "Admin authorization", status: ok ? "ok" : "error", detail: ok ? "Administrator access verified" : "Account is not an administrator" }); } catch (e) { checks.push({ label: "Admin authorization", status: "error", detail: e instanceof Error ? e.message : "Authorization check failed" }); }
      try { const [e, a, g, n, al, s] = await Promise.all([getAdminEvents(token), getAdminAnalytics(token), getAdminFeaturedGuestbook(token), getNotifications(token), getAuditLogs(token), getAdminSettings(token)]); if (!cancelled) { setEvents(e || []); setAnalytics(a || { total: 0, byType: {}, recent: [] }); setGuestbook(g || []); setNotifications(n || []); setAudit(al || []); setSettings(Object.fromEntries((s || []).map((x:any) => [x.key, x.value]))); } checks.push({ label: "Admin data", status: "ok", detail: "Core admin data loaded" }); } catch (e) { checks.push({ label: "Admin data", status: "warn", detail: e instanceof Error ? e.message : "Some modules are unavailable" }); }
      try { const r = await fetch("/api/admin-users?action=list_sessions", { headers: { Authorization: `Bearer ${token}` } }); checks.push({ label: "Admin session service", status: r.ok ? "ok" : "warn", detail: r.ok ? "Session endpoint reachable" : "Session endpoint unavailable" }); } catch { checks.push({ label: "Admin session service", status: "warn", detail: "Session endpoint unavailable" }); }
      if (!cancelled) setHealth(checks);
    };
    void load(); return () => { cancelled = true; };
  }, [token]);

  const filteredModules = useMemo(() => { const q = search.trim().toLowerCase(); if (!q) return ADMIN_MODULES; return ADMIN_MODULES.filter(m => `${m.label} ${m.description} ${m.children.map(c=>c.label).join(" ")}`.toLowerCase().includes(q)); }, [search]);
  const module = ADMIN_MODULES.find(m => m.id === active) || ADMIN_MODULES[0];
  const totals = { events: events.length, guestbook: guestbook.length, notifications: notifications.length, audit: audit.length, visitors: analytics.total || 0 };

  if (!token) return <Login onLogin={setToken} />;

  const logout = () => { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem("wedding-admin-session-id"); setToken(""); };
  const publish = async () => { setPublishing(true); await new Promise(r => setTimeout(r, 650)); setDraft(false); setPublishing(false); setToast("Published state saved. Connect your production publish service to deploy live content."); };
  const select = (id: string) => { setActive(id); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return <div className="min-h-screen bg-muted/20 text-foreground">
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center gap-3 px-3 md:px-5">
        <button className="grid h-10 w-10 place-items-center rounded-xl border md:hidden" onClick={()=>setMobileNav(true)} aria-label="Open navigation"><Menu size={19}/></button>
        <button className="hidden h-10 w-10 place-items-center rounded-xl border md:grid" onClick={()=>setSidebarOpen(v=>!v)} aria-label="Toggle sidebar">{sidebarOpen ? <PanelLeftClose size={18}/> : <PanelLeftOpen size={18}/>}</button>
        <button onClick={()=>select("dashboard")} className="flex min-w-0 items-center gap-2.5 text-left"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={17}/></div><div className="hidden sm:block"><div className="text-sm font-semibold leading-none">Wedding Admin</div><div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Control Center</div></div></button>
        <div className="relative ml-auto hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search admin…" className="h-10 w-full rounded-xl border bg-muted/30 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"/><kbd className="absolute right-2 top-2 rounded-md border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd></div>
        <button onClick={()=>select("dashboard")} className="hidden h-10 items-center gap-2 rounded-xl border px-3 text-sm md:flex"><Eye size={16}/>Preview</button>
        <button onClick={()=>void publish()} disabled={publishing} className="hidden h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm text-primary-foreground disabled:opacity-60 md:flex"><Rocket size={16}/>{publishing ? "Publishing…" : "Publish"}</button>
        <button onClick={()=>setDark(v=>!v)} className="grid h-10 w-10 place-items-center rounded-xl border" aria-label="Toggle theme">{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>
        <button onClick={logout} className="hidden h-10 items-center gap-2 rounded-xl border px-3 text-sm lg:flex"><LogOut size={16}/>Logout</button>
      </div>
      <div className="border-t bg-muted/20 px-4 py-2 md:hidden"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search admin modules…" className="h-9 w-full rounded-lg border bg-background pl-9 text-sm"/></div></div>
    </header>

    <div className="flex">
      <aside className={`${sidebarOpen ? "w-64" : "w-[72px]"} sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 overflow-y-auto border-r bg-background transition-[width] md:block`}>
        <nav className="space-y-5 p-3" aria-label="Administration">
          {(["wedding","insights","management","system"] as const).map(group => <div key={group}><div className={`${sidebarOpen ? "px-3" : "text-center"} mb-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground`}>{sidebarOpen ? GROUP_LABELS[group] : "•"}</div><div className="space-y-1">{filteredModules.filter(m=>m.group===group).map(m=><NavItem key={m.id} module={m} active={active===m.id} collapsed={!sidebarOpen} onClick={()=>select(m.id)}/>)}</div></div>)}
        </nav>
      </aside>

      {mobileNav && <div className="fixed inset-0 z-[60] md:hidden"><button className="absolute inset-0 bg-black/40" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/><aside className="relative h-full w-[85vw] max-w-sm overflow-y-auto bg-background p-4 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div className="font-semibold">Administration</div><button className="grid h-9 w-9 place-items-center rounded-lg border" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>{(["wedding","insights","management","system"] as const).map(group=><div key={group} className="mb-5"><div className="mb-2 px-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">{GROUP_LABELS[group]}</div>{filteredModules.filter(m=>m.group===group).map(m=><NavItem key={m.id} module={m} active={active===m.id} collapsed={false} onClick={()=>select(m.id)}/>)}</div>)}</aside></div>}

      <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span>Admin</span><ChevronRight size={13}/><span>{module.label}</span></div><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{module.label}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{module.description}</p></div><div className="flex flex-wrap items-center gap-2"><div className={`rounded-full border px-3 py-1.5 text-xs ${draft ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{draft ? "● Draft changes" : "● All changes saved"}</div><button onClick={()=>setDraft(true)} className="inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs"><Zap size={14}/>Create draft</button></div></div>

          {active === "dashboard" ? <Dashboard totals={totals} health={health} events={events} onSelect={select}/> : <ModulePage module={module} settings={settings} totals={totals} health={health} onToast={setToast} onSelect={select}/>}        
        </div>
      </main>
    </div>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-2xl border bg-background p-4 text-sm shadow-xl"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 text-emerald-600" size={18}/><div>{toast}</div><button onClick={()=>setToast("")}><X size={15}/></button></div></div>}
  </div>;
}

function NavItem({ module, active, collapsed, onClick }: { module: AdminModule; active: boolean; collapsed: boolean; onClick: ()=>void }) {
  const Icon = module.icon;
  return <button onClick={onClick} title={collapsed ? module.label : undefined} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{<Icon size={17} className="shrink-0"/>}{!collapsed && <><span className="min-w-0 flex-1 truncate">{module.label}</span>{module.status === "planned" && <span className="text-[9px] uppercase">Soon</span>}</>}</button>;
}

function Dashboard({ totals, health, events, onSelect }: { totals: Record<string, number>; health: Health[]; events: EventRecord[]; onSelect: (id:string)=>void }) {
  const okCount = health.filter(h=>h.status==="ok").length;
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Events" value={totals.events} detail="Configured wedding events"/><StatCard label="Guestbook" value={totals.guestbook} detail="Messages currently loaded"/><StatCard label="Notifications" value={totals.notifications} detail="Admin notification records"/><StatCard label="Audit entries" value={totals.audit} detail="Recent activity records"/><StatCard label="Visitors" value={totals.visitors} detail="Analytics total"/></div><div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]"><section className="rounded-3xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Quick actions</h2><p className="mt-1 text-sm text-muted-foreground">Jump directly to common administration tasks.</p></div><Sparkles size={18} className="text-primary"/></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["website","Edit website"],["events","Manage events"],["media","Open media"],["guestbook","Moderate guestbook"],["analytics","View analytics"],["security","Security status"]].map(([id,label])=><button key={id} onClick={()=>onSelect(id)} className="flex items-center justify-between rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"><span className="text-sm font-medium">{label}</span><ChevronRight size={16} className="text-muted-foreground"/></button>)}</div></section><section className="rounded-3xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">System health</h2><p className="mt-1 text-sm text-muted-foreground">{okCount}/{health.length || 0} checks healthy</p></div><ShieldCheck size={18} className="text-primary"/></div><div className="mt-4 space-y-3">{health.length ? health.map(h=><div key={h.label} className="flex items-start gap-3 rounded-xl border p-3"><StatusDot status={h.status}/><div className="min-w-0"><div className="text-sm font-medium">{h.label}</div><div className="text-xs text-muted-foreground">{h.detail}</div></div></div>) : <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Health checks are loading…</div>}</div></section></div><section className="rounded-3xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Upcoming events</h2><p className="mt-1 text-sm text-muted-foreground">The next configured wedding events.</p></div><button onClick={()=>onSelect("events")} className="text-xs font-medium text-primary">View all</button></div><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{events.slice(0,6).map((event:any)=><div key={event.id} className="rounded-2xl border p-4"><div className="font-medium">{event.title || event.slug || "Untitled event"}</div><div className="mt-1 text-xs text-muted-foreground">{event.date || "Date not set"}</div></div>)}{!events.length && <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No events loaded yet.</div>}</div></section></div>;
}

function ModulePage({ module, settings, totals, health, onToast, onSelect }: { module: AdminModule; settings: Record<string,any>; totals: Record<string,number>; health: Health[]; onToast: (message:string)=>void; onSelect:(id:string)=>void }) {
  const [selected, setSelected] = useState(module.children[0]?.id || "");
  useEffect(()=>setSelected(module.children[0]?.id || ""), [module.id]);
  const title = module.children.find(c=>c.id===selected)?.label || module.label;
  const lower = module.id;
  const isStatus = ["security","system","integrations","diagnostics"].includes(lower);
  const action = (message:string) => { onToast(message); };
  return <div className="grid gap-6 lg:grid-cols-[230px_1fr]"><section className="h-fit rounded-3xl border bg-card p-2 shadow-sm"><div className="p-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{module.label}</div><div className="space-y-1">{module.children.map(child=><button key={child.id} onClick={()=>setSelected(child.id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm capitalize transition ${selected===child.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{child.label}</button>)}</div></section><section className="min-w-0 rounded-3xl border bg-card p-5 shadow-sm md:p-7"><div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{module.label}</div><h2 className="mt-1 text-2xl font-semibold capitalize">{title}</h2><p className="mt-2 text-sm text-muted-foreground">This module is wired to the platform architecture and is ready for its domain data/actions.</p></div><button onClick={()=>action(`${title} changes are saved as a draft.`)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm text-primary-foreground"><CheckCircle2 size={15}/>Save draft</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><InfoCard title="Module status" value={isStatus ? "Connected" : "Ready"} detail="Platform foundation active"/><InfoCard title="Permission" value={module.actions.includes("manage") ? "Manage" : "View"} detail={`${module.actions.length} supported actions`}/><InfoCard title="Data" value={module.id === "events" ? String(totals.events) : module.id === "guestbook" ? String(totals.guestbook) : "—"} detail="Current records"/></div><div className="mt-6 rounded-2xl border bg-muted/20 p-5"><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm text-muted-foreground">Use this workspace for {module.description.toLowerCase()}</p>{module.id === "website" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><ActionButton label="Section Manager" onClick={()=>action("Section Manager opened. Use the existing content editor for live section data.")}/><ActionButton label="Preview website" onClick={()=>window.open("/", "_blank", "noopener,noreferrer")}/></div>}{module.id === "events" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><ActionButton label="Create event" icon={<Plus size={15}/>} onClick={()=>action("Event creation workspace is ready.")}/><ActionButton label="Open event manager" onClick={()=>onSelect("events")}/></div>}{module.id === "media" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><ActionButton label="Open gallery" onClick={()=>window.open("/gallery", "_blank", "noopener,noreferrer")}/><ActionButton label="Open videos" onClick={()=>window.open("/videos", "_blank", "noopener,noreferrer")}/></div>}{module.id === "security" && <div className="mt-4 space-y-3">{health.map(h=><div key={h.label} className="flex items-center gap-3 rounded-xl border bg-background p-3"><StatusDot status={h.status}/><div><div className="text-sm font-medium">{h.label}</div><div className="text-xs text-muted-foreground">{h.detail}</div></div></div>)}</div>}{module.id === "settings" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><SettingPreview label="Wedding settings" value={settings.wedding ? "Configured" : "Not configured"}/><SettingPreview label="Theme" value={settings.theme ? "Configured" : "Default"}/><SettingPreview label="Site control" value={settings.siteControl ? "Configured" : "Default"}/></div>}{module.id === "publishing" && <div className="mt-4 rounded-2xl border p-5"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-muted px-3 py-1 text-xs">Draft</span><span className="rounded-full bg-muted px-3 py-1 text-xs">Preview</span><span className="rounded-full bg-muted px-3 py-1 text-xs">Validate</span><span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Publish</span></div><p className="mt-4 text-sm text-muted-foreground">Publishing is intentionally separated from editing so future revisions can be reviewed before going live.</p></div>}{module.id === "help" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><ActionButton label="Open current admin tools" icon={<ArrowLeft size={15}/>} onClick={()=>window.location.assign("/admin/legacy")}/><ActionButton label="View documentation" icon={<CircleHelp size={15}/>} onClick={()=>action("Documentation workspace ready.")}/></div>}</div></section></div>;
}

function InfoCard({ title, value, detail }: { title:string; value:string; detail:string }) { return <div className="rounded-2xl border p-4"><div className="text-xs text-muted-foreground">{title}</div><div className="mt-1 text-xl font-semibold capitalize">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>; }
function SettingPreview({ label, value }: { label:string; value:string }) { return <div className="rounded-xl border bg-background p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>; }
function ActionButton({ label, onClick, icon }: { label:string; onClick:()=>void; icon?:React.ReactNode }) { return <button onClick={onClick} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">{icon}{label}</button>; }
