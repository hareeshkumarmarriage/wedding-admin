import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, ArrowDown, ArrowUp, BarChart3, Bell, BookOpen, Boxes, CalendarDays, Check,
  ChevronRight, Download, Eye, FileArchive, FileClock, FileImage, Gauge, Globe2, Heart,
  HelpCircle, KeyRound, Link2, LogOut, MapPin, Menu, Moon, Palette, Plus, QrCode,
  RefreshCw, Rocket, Search, Settings2, ShieldCheck, Sparkles, Sun, Trash2, UserCog, X
} from "lucide-react";
import { ADMIN_MODULES, GROUP_LABELS } from "@/admin/moduleRegistry";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase";
import {
  getAdminEvents, getAdminFeaturedGuestbook, getNotifications, getAuditLogs,
  getAdminSettings, getAdminAnalytics, getAdminHomepageSections, updateHomepageSections,
  saveSiteSetting, writeAdminAudit, setGuestbookModeration, setGuestbookFeatured,
  deleteGuestbookMessage, createNotification, deleteNotification, getEventSecurityCodes,
  changeEventSecurityCode, changeAllEventSecurityCodes, type EventRecord
} from "@/lib/supabaseData";

type AnyRecord = Record<string, any>;
type Health = { label: string; status: "ok" | "warn" | "error"; detail: string };
type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "toggle" | "select"; placeholder?: string; options?: string[]; help?: string; defaultValue?: any };
const TOKEN_KEY = "wedding-admin-access-token";
const REFRESH_KEY = "wedding-admin-refresh-token";
const SOCIAL_DEFAULTS = {
  instagram: "https://www.instagram.com/pavan_kumar._.pk?igsi=MjJqcDhhajFmdGpw",
  youtube: "", facebook: "", whatsapp: "", phone: "", email: ""
};

function Button({ children, onClick, primary = false, danger = false, disabled = false }: { children: ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${primary ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : danger ? "border-red-200 text-red-700 hover:bg-red-50" : "bg-background"}`}>{children}</button>;
}
function Input({ label, value, onChange, type = "text", placeholder = "", help }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string; help?: string }) {
  return <label className="block text-sm font-medium"><span>{label}</span><input type={type} value={value ?? ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/20" />{help && <span className="mt-1 block text-xs text-muted-foreground">{help}</span>}</label>;
}
function Textarea({ label, value, onChange, help }: { label: string; value: any; onChange: (v: string) => void; help?: string }) {
  return <label className="block text-sm font-medium"><span>{label}</span><textarea value={value ?? ""} onChange={e => onChange(e.target.value)} className="mt-1 min-h-28 w-full rounded-xl border bg-background p-3 outline-none focus:ring-2 focus:ring-primary/20" />{help && <span className="mt-1 block text-xs text-muted-foreground">{help}</span>}</label>;
}
function Toggle({ label, value, onChange, help }: { label: string; value: any; onChange: (v: boolean) => void; help?: string }) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-background p-3 text-sm"><span><span className="font-medium">{label}</span>{help && <span className="mt-1 block text-xs text-muted-foreground">{help}</span>}</span><input className="mt-1 h-4 w-4" type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} /></label>;
}
function Select({ label, value, onChange, options, help }: { label: string; value: any; onChange: (v: string) => void; options: string[]; help?: string }) {
  return <label className="block text-sm font-medium"><span>{label}</span><select value={value ?? ""} onChange={e => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3">{options.map(x => <option key={x} value={x}>{x}</option>)}</select>{help && <span className="mt-1 block text-xs text-muted-foreground">{help}</span>}</label>;
}
function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">{title}</h2>{action}</div>{children}</section>;
}
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>; }

const FIELD_MAP: Record<string, Field[]> = {
  "website.home": [
    { key: "website.home.title", label: "Hero title", type: "text" },
    { key: "website.home.description", label: "Hero description", type: "textarea" },
    { key: "website.home.show_countdown", label: "Show countdown", type: "toggle", defaultValue: true },
    { key: "website.home.show_share", label: "Show share button", type: "toggle", defaultValue: true },
    { key: "website.home.share_position", label: "Share button position", type: "select", options: ["left", "right"], defaultValue: "left" },
  ],
  "website.couple": [
    { key: "website.couple.groom", label: "Groom name", type: "text" },
    { key: "website.couple.bride", label: "Bride name", type: "text" },
    { key: "website.couple.groom_subtitle", label: "Groom subtitle", type: "text" },
    { key: "website.couple.bride_subtitle", label: "Bride subtitle", type: "text" },
  ],
  "website.story": [
    { key: "website.story.title", label: "Story title", type: "text" },
    { key: "website.story.content", label: "Story content", type: "textarea" },
    { key: "website.story.enabled", label: "Show story section", type: "toggle", defaultValue: true },
  ],
  "website.timeline": [
    { key: "website.timeline.title", label: "Timeline title", type: "text" },
    { key: "website.timeline.enabled", label: "Show timeline", type: "toggle", defaultValue: true },
    { key: "website.timeline.default_icon", label: "Default timeline icon", type: "select", options: ["Church", "Camera", "Heart", "Calendar", "Music", "Home", "Sparkles"] },
  ],
  "website.footer": [
    { key: "website.footer.text", label: "Footer text", type: "textarea" },
    { key: "website.footer.show_social", label: "Show social links", type: "toggle", defaultValue: true },
  ],
  "website.navigation": [
    { key: "website.navigation.sticky", label: "Sticky navigation", type: "toggle", defaultValue: true },
    { key: "website.navigation.show_home", label: "Home link", type: "toggle", defaultValue: true },
    { key: "website.navigation.show_events", label: "Events link", type: "toggle", defaultValue: true },
    { key: "website.navigation.show_guestbook", label: "Guestbook link", type: "toggle", defaultValue: true },
  ],
  "appearance.theme": [
    { key: "appearance.theme.theme", label: "Primary theme", type: "select", options: ["Elegant", "Classic", "Modern", "Minimal"], defaultValue: "Elegant" },
  ],
  "appearance.colors": [
    { key: "appearance.colors.primary", label: "Primary color", type: "text", placeholder: "#8B5CF6" },
    { key: "appearance.colors.secondary", label: "Secondary color", type: "text", placeholder: "#F3E8FF" },
    { key: "appearance.colors.background", label: "Background color", type: "text", placeholder: "#FFFFFF" },
    { key: "appearance.colors.foreground", label: "Text color", type: "text", placeholder: "#171717" },
  ],
  "appearance.typography": [
    { key: "appearance.typography.font", label: "Font family", type: "select", options: ["Inter", "Poppins", "Playfair Display", "Cormorant Garamond", "Lora", "Montserrat"], defaultValue: "Inter" },
    { key: "appearance.typography.scale", label: "Type scale", type: "select", options: ["compact", "comfortable", "large"], defaultValue: "comfortable" },
  ],
  "appearance.backgrounds": [
    { key: "appearance.backgrounds.hero", label: "Hero background image URL", type: "text" },
    { key: "appearance.backgrounds.overlay", label: "Hero overlay opacity", type: "number", defaultValue: 40 },
  ],
  "appearance.buttons": [
    { key: "appearance.buttons.style", label: "Button style", type: "select", options: ["rounded", "soft", "pill"], defaultValue: "rounded" },
    { key: "appearance.buttons.show_icons", label: "Show button icons", type: "toggle", defaultValue: true },
  ],
  "appearance.animations": [
    { key: "appearance.animations.enabled", label: "Enable animations", type: "toggle", defaultValue: true },
    { key: "appearance.animations.intensity", label: "Animation intensity", type: "select", options: ["subtle", "normal", "cinematic"], defaultValue: "normal" },
  ],
  "appearance.responsive": [
    { key: "appearance.responsive.mobile_menu", label: "Mobile navigation menu", type: "toggle", defaultValue: true },
    { key: "appearance.responsive.mobile_landscape_intro", label: "Landscape intro on mobile", type: "toggle", defaultValue: true },
  ],
  "loading-intro.loading-screen": [
    { key: "loading-intro.loading-screen.enabled", label: "Enable loading screen", type: "toggle", defaultValue: true },
  ],
  "loading-intro.loading-text": [{ key: "loading-intro.loading-text.text", label: "Loading text", type: "text", defaultValue: "H & P" }],
  "loading-intro.blink-heart": [{ key: "loading-intro.blink-heart.text", label: "Blink-heart text", type: "text", defaultValue: "Loading your memories…" }],
  "loading-intro.loading-duration": [{ key: "loading-intro.loading-duration.duration", label: "Loading duration (ms)", type: "number", defaultValue: 1800, help: "Recommended 800–3000 ms." }],
  "loading-intro.intro-video": [
    { key: "loading-intro.intro-video.enabled", label: "Show intro video", type: "toggle", defaultValue: false },
    { key: "loading-intro.intro-video.drive_id", label: "Google Drive video ID", type: "text" },
  ],
  "loading-intro.autoplay": [{ key: "loading-intro.autoplay.enabled", label: "Autoplay intro", type: "toggle", defaultValue: true }],
  "loading-intro.mute": [{ key: "loading-intro.mute.enabled", label: "Mute intro initially", type: "toggle", defaultValue: true }],
  "loading-intro.skip-button": [{ key: "loading-intro.skip.enabled", label: "Show skip button", type: "toggle", defaultValue: true }],
  "loading-intro.fullscreen": [
    { key: "loading-intro.fullscreen.enabled", label: "Allow fullscreen control", type: "toggle", defaultValue: true },
    { key: "loading-intro.fullscreen.mobile_landscape", label: "Request landscape on mobile", type: "toggle", defaultValue: true },
  ],
  "social.instagram": [{ key: "social.instagram.url", label: "Instagram URL", type: "text", defaultValue: SOCIAL_DEFAULTS.instagram }],
  "social.youtube": [{ key: "social.youtube.url", label: "YouTube URL", type: "text", help: "Use a real youtube.com URL." }],
  "social.facebook": [{ key: "social.facebook.url", label: "Facebook URL", type: "text" }],
  "social.whatsapp": [{ key: "social.whatsapp.url", label: "WhatsApp URL", type: "text" }],
  "social.phone": [{ key: "social.phone.url", label: "Phone link", type: "text", placeholder: "tel:+91…" }],
  "social.email": [{ key: "social.email.url", label: "Email link", type: "text", placeholder: "mailto:…" }],
  "social.social-sharing": [
    { key: "social.share.enabled", label: "Enable website sharing", type: "toggle", defaultValue: true },
    { key: "social.share.position", label: "Share button position", type: "select", options: ["left", "right"], defaultValue: "left" },
  ],
  "settings.general": [
    { key: "settings.general.site_name", label: "Site name", type: "text", defaultValue: "Hareesh & Prasanna" },
    { key: "settings.general.admin_email", label: "Admin email", type: "text" },
  ],
  "settings.wedding": [
    { key: "settings.wedding.groom", label: "Groom", type: "text" },
    { key: "settings.wedding.bride", label: "Bride", type: "text" },
    { key: "settings.wedding.tagline", label: "Tagline", type: "text" },
  ],
  "settings.date-time": [
    { key: "settings.date-time.wedding_date", label: "Wedding date/time", type: "text", placeholder: "2026-04-04T18:00" },
    { key: "settings.date-time.timezone", label: "Timezone", type: "select", options: ["Asia/Kolkata", "UTC", "Asia/Dubai", "Asia/Singapore"], defaultValue: "Asia/Kolkata" },
  ],
  "settings.language": [{ key: "settings.language.code", label: "Language", type: "select", options: ["en", "te", "hi"], defaultValue: "en" }],
  "settings.notifications": [
    { key: "settings.notifications.guestbook_alerts", label: "Guestbook alerts", type: "toggle", defaultValue: true },
    { key: "settings.notifications.security_alerts", label: "Security alerts", type: "toggle", defaultValue: true },
  ],
  "settings.website": [
    { key: "settings.website.maintenance", label: "Maintenance mode", type: "toggle", defaultValue: false },
    { key: "settings.website.noindex", label: "No-index website", type: "toggle", defaultValue: false },
  ],
  "settings.advanced": [
    { key: "settings.advanced.cache_seconds", label: "Public cache seconds", type: "number", defaultValue: 60 },
    { key: "settings.advanced.debug", label: "Debug mode", type: "toggle", defaultValue: false },
  ],
};

const CHILD_TITLES: Record<string, string> = {
  "all-events": "All events", "add-event": "Add event", schedule: "Schedule", location: "Location", gallery: "Gallery", videos: "Videos", visibility: "Visibility", "event-settings": "Event settings",
  library: "Media library", photos: "Photos", videos: "Videos", folders: "Folders", "google-drive": "Google Drive", "event-media": "Event media", "upload-queue": "Upload queue", "failed-uploads": "Failed uploads", statistics: "Media statistics",
};

export default function AdminControlCenterV4() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [active, setActive] = useState("dashboard");
  const [child, setChild] = useState("");
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("admin-theme") === "dark");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [guestbook, setGuestbook] = useState<AnyRecord[]>([]);
  const [notifications, setNotifications] = useState<AnyRecord[]>([]);
  const [audit, setAudit] = useState<AnyRecord[]>([]);
  const [settings, setSettings] = useState<AnyRecord>({});
  const [analytics, setAnalytics] = useState<AnyRecord>({});
  const [sections, setSections] = useState<AnyRecord[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const modules = useMemo(() => { const q = search.trim().toLowerCase(); return q ? ADMIN_MODULES.filter(m => `${m.label} ${m.description} ${m.children.map(c => c.label).join(" ")}`.toLowerCase().includes(q)) : ADMIN_MODULES; }, [search]);
  const current = ADMIN_MODULES.find(m => m.id === active) || ADMIN_MODULES[0];
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("admin-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => setChild(current.children[0]?.id || ""), [active]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3500); };
  const load = async () => {
    if (!token) return; setBusy(true);
    const h: Health[] = [{ label: "Supabase", status: isSupabaseConfigured ? "ok" : "error", detail: isSupabaseConfigured ? "Configured" : "Missing configuration" }];
    try {
      const authorized = await supabaseRest<boolean>("rpc/is_admin", { method: "POST", token, body: {} });
      h.push({ label: "Admin authorization", status: authorized ? "ok" : "error", detail: authorized ? "Verified" : "Denied" });
      if (!authorized) { sessionStorage.clear(); setToken(""); setBusy(false); return; }
    } catch (e) { h.push({ label: "Admin authorization", status: "error", detail: e instanceof Error ? e.message : "Failed" }); setBusy(false); setHealth(h); return; }
    try {
      const [ev, gb, no, al, st, an, hs] = await Promise.all([
        getAdminEvents(token), getAdminFeaturedGuestbook(token), getNotifications(token), getAuditLogs(token), getAdminSettings(token), getAdminAnalytics(token), getAdminHomepageSections(token)
      ]);
      setEvents(ev || []); setGuestbook(gb || []); setNotifications(no || []); setAudit(al || []); setSettings(Object.fromEntries((st || []).map(x => [x.key, x.value]))); setAnalytics(an || {}); setSections(hs || []);
      h.push({ label: "Admin data", status: "ok", detail: "Core records loaded" });
    } catch (e) { h.push({ label: "Admin data", status: "warn", detail: e instanceof Error ? e.message : "Some records unavailable" }); }
    try { const r = await fetch("/api/admin-users?action=list_sessions", { headers: { Authorization: `Bearer ${token}` } }); h.push({ label: "Session service", status: r.ok ? "ok" : "warn", detail: r.ok ? "Reachable" : "Unavailable" }); } catch { h.push({ label: "Session service", status: "warn", detail: "Unavailable" }); }
    try { const r = await fetch("/api/event-security-status", { cache: "no-store" }); h.push({ label: "Event security", status: r.ok ? "ok" : "warn", detail: r.ok ? "Security service reachable" : "Security service unavailable" }); } catch { h.push({ label: "Event security", status: "warn", detail: "Security service unavailable" }); }
    setHealth(h); setBusy(false);
  };
  useEffect(() => { void load(); }, [token]);
  const go = (id: string) => { setActive(id); setMobile(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const logout = () => { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(REFRESH_KEY); setToken(""); };
  const publish = async () => {
    try { const revision = await supabaseRest<string>("rpc/admin_publish_revision", { method: "POST", token, body: { p_label: `Publish ${new Date().toLocaleString()}` } }); await writeAdminAudit(token, "publish_homepage", String(revision)); notify("Published a new revision successfully."); }
    catch (e) { notify(e instanceof Error ? e.message : "Publish failed"); }
  };
  if (!token) return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md rounded-3xl border bg-card p-7 text-center shadow-xl"><Sparkles className="mx-auto mb-4" /><h1 className="text-2xl font-semibold">Admin session required</h1><p className="mt-2 text-sm text-muted-foreground">Return to /admin and sign in again.</p></div></div>;
  return <div className="min-h-screen bg-muted/20">
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur"><div className="flex h-16 items-center gap-2 px-3 md:px-5">
      <Button onClick={() => setMobile(true)}><Menu size={18} /></Button><button type="button" onClick={() => go("dashboard")} className="flex items-center gap-2 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={17} /></span><span className="hidden sm:block">Wedding Admin</span></button>
      <div className="relative ml-auto hidden max-w-md flex-1 md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search any module or panel…" className="h-10 w-full rounded-xl border bg-muted/30 pl-9 pr-3 text-sm" /></div>
      <Button onClick={() => window.open("/", "_blank", "noopener,noreferrer")}><Eye size={16} />Preview</Button><Button primary onClick={() => void publish()}><Rocket size={16} />Publish</Button><Button onClick={() => setDark(v => !v)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</Button><Button onClick={logout}><LogOut size={16} /></Button>
    </div><div className="border-t p-2 md:hidden"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules…" className="h-9 w-full rounded-lg border px-3 text-sm" /></div></header>
    <div className="flex">
      <aside className={`${collapsed ? "w-16" : "w-64"} sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 overflow-y-auto border-r bg-background md:block`}><div className="p-3"><Button onClick={() => setCollapsed(v => !v)}>{collapsed ? "☰" : "Collapse"}</Button>{(["wedding", "insights", "management", "system"] as const).map(group => <div key={group} className="mt-5"><div className="mb-2 px-2 text-[10px] font-semibold tracking-widest text-muted-foreground">{collapsed ? "•" : GROUP_LABELS[group]}</div>{modules.filter(m => m.group === group).map(m => <button key={m.id} type="button" title={collapsed ? m.label : undefined} onClick={() => go(m.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${active === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><m.icon size={17} />{!collapsed && <span className="truncate">{m.label}</span>}</button>)}</div>)}</div></aside>
      {mobile && <div className="fixed inset-0 z-[70] md:hidden"><button className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} aria-label="Close" /><aside className="relative h-full w-[88vw] max-w-sm overflow-y-auto bg-background p-4"><div className="mb-4 flex justify-between"><b>Administration</b><Button onClick={() => setMobile(false)}><X size={17} /></Button></div>{(["wedding", "insights", "management", "system"] as const).map(group => <div key={group} className="mb-5"><div className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground">{GROUP_LABELS[group]}</div>{modules.filter(m => m.group === group).map(m => <button key={m.id} type="button" onClick={() => go(m.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${active === m.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><m.icon size={17} />{m.label}</button>)}</div>)}</aside></div>}
      <main className="min-w-0 flex-1 p-4 md:p-7"><div className="mx-auto max-w-[1550px]"><div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">Admin <ChevronRight size={13} /> {current.label}</div><h1 className="text-3xl font-semibold">{current.label}</h1><p className="mt-2 text-sm text-muted-foreground">{current.description}</p></div><Button onClick={() => void load()} disabled={busy}><RefreshCw className={busy ? "animate-spin" : ""} size={15} />Refresh</Button></div>
        {active === "dashboard" ? <Dashboard events={events} guestbook={guestbook} analytics={analytics} health={health} onGo={go} /> : <ModuleView module={current} child={child} setChild={setChild} token={token} settings={settings} setSettings={setSettings} events={events} setEvents={setEvents} guestbook={guestbook} setGuestbook={setGuestbook} notifications={notifications} setNotifications={setNotifications} analytics={analytics} audit={audit} health={health} sections={sections} setSections={setSections} notify={notify} reload={load} />}
      </div></main>
    </div>{toast && <div role="status" className="fixed bottom-5 right-5 z-[100] max-w-sm rounded-2xl border bg-background p-4 text-sm shadow-xl">{toast}</div>}
  </div>;
}

function Dashboard({ events, guestbook, analytics, health, onGo }: any) {
  const ok = health.filter((x: Health) => x.status === "ok").length;
  const cards = [["Events", events.length, "events"], ["Guestbook", guestbook.length, "guestbook"], ["Visitors", analytics.total || 0, "analytics"], ["Reactions", analytics.reactionTotal || 0, "interactions"], ["Health", `${ok}/${health.length}`, "system"]];
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([a, b, id]) => <button key={String(a)} type="button" onClick={() => onGo(id)} className="rounded-2xl border bg-card p-5 text-left hover:bg-muted"><div className="text-xs text-muted-foreground">{a}</div><div className="mt-2 text-3xl font-semibold">{b}</div></button>)}</div><div className="grid gap-6 lg:grid-cols-2"><Card title="Quick actions"><div className="grid gap-3 sm:grid-cols-2">{[["website", "Website"], ["appearance", "Appearance"], ["loading-intro", "Loading & Intro"], ["events", "Events"], ["media", "Media"], ["guestbook", "Guestbook"], ["social", "Social & Contact"], ["locations", "Locations"], ["qr", "QR Codes"], ["analytics", "Analytics"], ["security", "Security"], ["publishing", "Publishing"], ["administration", "Administration"], ["backup", "Backup & Restore"], ["diagnostics", "Testing & Diagnostics"], ["trash", "Trash & Recovery"]].map(([id, label]) => <Button key={id} onClick={() => onGo(id)}>{label}<ChevronRight size={15} /></Button>)}</div></Card><Card title="System health"><div className="space-y-3">{health.map(h => <div key={h.label} className="flex gap-3 rounded-xl border p-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${h.status === "ok" ? "bg-emerald-500" : h.status === "warn" ? "bg-amber-500" : "bg-red-500"}`} /><div><b>{h.label}</b><div className="text-xs text-muted-foreground">{h.detail}</div></div></div>)}</div></Card></div></div>;
}

function ModuleView(p: any) {
  const { module, child, setChild } = p;
  return <div className="space-y-5"><div className="flex gap-2 overflow-x-auto pb-1">{module.children.map((c: any) => <button key={c.id} type="button" onClick={() => setChild(c.id)} className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm ${child === c.id ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{CHILD_TITLES[c.id] || c.label}</button>)}</div>
    {module.id === "website" && child === "section-manager" ? <HomepagePanel {...p} /> : module.id === "events" ? <EventsPanel {...p} /> : module.id === "guestbook" ? <GuestbookPanel {...p} /> : module.id === "notifications" ? <NotificationsPanel {...p} /> : module.id === "analytics" ? <AnalyticsPanel {...p} /> : module.id === "audit" ? <AuditPanel {...p} /> : module.id === "security" ? <SecurityPanel {...p} /> : module.id === "administration" ? <AdministrationPanel {...p} /> : module.id === "backup" ? <BackupPanel {...p} /> : module.id === "qr" ? <QrPanel {...p} /> : module.id === "locations" ? <LocationsPanel {...p} /> : module.id === "publishing" ? <PublishingPanel {...p} /> : module.id === "diagnostics" ? <DiagnosticsPanel {...p} /> : module.id === "trash" ? <TrashPanel {...p} /> : module.id === "help" ? <HelpPanel {...p} /> : module.id === "system" ? <SystemPanel {...p} /> : module.id === "integrations" ? <IntegrationsPanel {...p} /> : module.id === "interactions" ? <InteractionsPanel {...p} /> : <SettingsPanel {...p} />}
  </div>;
}

async function saveField(token: string, key: string, value: any, setSettings: any, notify: (s: string) => void) {
  try { await saveSiteSetting(token, key, value); setSettings((s: AnyRecord) => ({ ...s, [key]: value })); await writeAdminAudit(token, "update_settings", key); notify("Saved successfully and synced."); }
  catch (e) { notify(e instanceof Error ? e.message : "Save failed"); }
}
function SettingsPanel({ module, child, token, settings, setSettings, notify }: any) {
  const id = `${module.id}.${child}`;
  const fields = FIELD_MAP[id] || makeFallbackFields(module, child);
  const [draft, setDraft] = useState<AnyRecord>({});
  useEffect(() => setDraft(Object.fromEntries(fields.map(f => [f.key, settings[f.key] ?? f.defaultValue ?? (f.type === "toggle" ? false : "")]))), [id, settings]);
  const update = (key: string, value: any) => setDraft((d: AnyRecord) => ({ ...d, [key]: value }));
  return <Card title={CHILD_TITLES[child] || `${module.label} · ${child.replaceAll("-", " ")}`} action={<span className="text-xs text-muted-foreground">Changes are saved individually</span>}>
    <div className="grid gap-4 md:grid-cols-2">{fields.map(f => f.type === "toggle" ? <Toggle key={f.key} label={f.label} value={draft[f.key]} onChange={v => update(f.key, v)} help={f.help} /> : f.type === "textarea" ? <div key={f.key} className="md:col-span-2"><Textarea label={f.label} value={draft[f.key]} onChange={v => update(f.key, v)} help={f.help} /></div> : f.type === "select" ? <Select key={f.key} label={f.label} value={draft[f.key]} onChange={v => update(f.key, v)} options={f.options || []} help={f.help} /> : <Input key={f.key} label={f.label} value={draft[f.key]} onChange={v => update(f.key, f.type === "number" ? Number(v) : v)} type={f.type === "number" ? "number" : "text"} placeholder={f.placeholder} help={f.help} />)}</div>
    <div className="mt-5 flex flex-wrap gap-2"><Button primary onClick={() => void Promise.all(fields.map(f => saveField(token, f.key, draft[f.key], setSettings, notify)))}><Check size={16} />Save {fields.length > 1 ? "all" : "changes"}</Button><Button onClick={() => setDraft(Object.fromEntries(fields.map(f => [f.key, settings[f.key] ?? f.defaultValue ?? (f.type === "toggle" ? false : "")]))) }><RefreshCw size={15} />Reset</Button></div>
  </Card>;
}
function makeFallbackFields(module: any, child: string): Field[] {
  const base = `${module.id}.${child}`;
  return [
    { key: `${base}.enabled`, label: "Enable this feature", type: "toggle", defaultValue: true, help: "This control is stored in the admin configuration namespace." },
    { key: `${base}.title`, label: "Title", type: "text", defaultValue: CHILD_TITLES[child] || child.replaceAll("-", " ") },
    { key: `${base}.description`, label: "Description", type: "textarea" },
  ];
}

function HomepagePanel({ token, sections, setSections, notify, reload }: any) {
  const [local, setLocal] = useState(sections);
  useEffect(() => setLocal(sections), [sections]);
  const move = (index: number, dir: number) => { const next = [...local]; const target = index + dir; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setLocal(next); };
  const save = async () => { try { await updateHomepageSections(token, local); setSections(local); await writeAdminAudit(token, "update_homepage"); notify("Homepage sections saved."); } catch (e) { notify(e instanceof Error ? e.message : "Unable to save sections"); } };
  return <Card title="Homepage Section Manager" action={<Button primary onClick={() => void save()}><Check size={16} />Save order & visibility</Button>}><div className="space-y-2">{local.map((s: any, i: number) => <div key={s.key} className="flex flex-wrap items-center gap-2 rounded-2xl border p-3"><div className="min-w-0 flex-1"><b>{s.label}</b><div className="text-xs text-muted-foreground">{s.key}</div></div><Toggle label="Visible" value={s.enabled} onChange={v => setLocal((x: any[]) => x.map((a, j) => j === i ? { ...a, enabled: v } : a))} /><Button onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={15} /></Button><Button onClick={() => move(i, 1)} disabled={i === local.length - 1}><ArrowDown size={15} /></Button><Button onClick={() => window.open(`/?section=${encodeURIComponent(s.key)}`, "_blank", "noopener,noreferrer")}><Eye size={15} />View</Button></div>)}</div><div className="mt-4 text-xs text-muted-foreground">Edit a section through its matching Website panel; View opens and focuses the public section.</div></Card>;
}

function EventsPanel({ token, events, setEvents, child, notify }: any) {
  const [selected, setSelected] = useState<EventRecord | null>(events[0] || null);
  useEffect(() => { if (!selected && events[0]) setSelected(events[0]); }, [events]);
  const [form, setForm] = useState<AnyRecord>({});
  useEffect(() => { if (selected) setForm({ ...selected }); }, [selected?.id]);
  const save = async () => { try { if (!form.title || !form.slug) throw new Error("Title and slug are required."); const body = { ...form, sort_order: Number(form.sort_order || 0), is_active: Boolean(form.is_active), photos_enabled: Boolean(form.photos_enabled), videos_enabled: Boolean(form.videos_enabled), slideshow_enabled: Boolean(form.slideshow_enabled), qr_enabled: Boolean(form.qr_enabled) }; let result: EventRecord[]; if (selected) result = await supabaseRest<EventRecord[]>("events", { method: "PATCH", token, query: `id=eq.${encodeURIComponent(selected.id)}`, body, prefer: "return=representation" }); else result = await supabaseRest<EventRecord[]>("events", { method: "POST", token, body, prefer: "return=representation" }); setEvents(selected ? events.map((e: EventRecord) => e.id === selected.id ? { ...e, ...body } : e) : [...events, ...(result || [])]); await writeAdminAudit(token, selected ? "update_event" : "update_event", selected?.id || null); notify(selected ? "Event updated." : "Event created."); } catch (e) { notify(e instanceof Error ? e.message : "Event save failed"); } };
  const remove = async () => { if (!selected || !window.confirm(`Delete ${selected.title}?`)) return; try { await supabaseRest("events", { method: "DELETE", token, query: `id=eq.${encodeURIComponent(selected.id)}` }); setEvents(events.filter((e: EventRecord) => e.id !== selected.id)); setSelected(null); notify("Event deleted."); } catch (e) { notify(e instanceof Error ? e.message : "Delete failed"); } };
  const blank = () => { setSelected(null); setForm({ slug: "", title: "", description: "", date: "", drive_folder_id: "", photos_drive_folder_id: "", photos_drive_folder_id_2: "", videos_drive_folder_id: "", videos_drive_folder_id_2: "", venue_name: "", venue_address: "", maps_url: "", sort_order: events.length + 1, is_active: true, photos_enabled: true, videos_enabled: true, slideshow_enabled: true, qr_enabled: true }); };
  if (child === "all-events" || child === "add-event" || child === "schedule" || child === "location" || child === "gallery" || child === "videos" || child === "visibility" || child === "event-settings") return <div className="grid gap-5 lg:grid-cols-[330px_1fr]"><Card title="Events" action={<Button onClick={blank}><Plus size={15} />New</Button>}><div className="space-y-2">{events.map((e: EventRecord) => <button key={e.id} type="button" onClick={() => setSelected(e)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === e.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}><b>{e.title}</b><div className="text-xs text-muted-foreground">/{e.slug}</div></button>)}{!events.length && <Empty text="No events yet. Create the first event." />}</div></Card><Card title={selected ? `Edit ${selected.title}` : "Create event"}><div className="grid gap-4 md:grid-cols-2">
    <Input label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} /><Input label="Slug" value={form.slug} onChange={v => setForm({ ...form, slug: v })} /><Input label="Date/time" value={form.date} onChange={v => setForm({ ...form, date: v })} /><Input label="Sort order" type="number" value={form.sort_order} onChange={v => setForm({ ...form, sort_order: Number(v) })} />
    <div className="md:col-span-2"><Textarea label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} /></div>
    <Input label="Drive folder ID" value={form.drive_folder_id} onChange={v => setForm({ ...form, drive_folder_id: v })} /><Input label="Cover image Drive ID" value={form.cover_image_drive_id} onChange={v => setForm({ ...form, cover_image_drive_id: v })} />
    <Input label="Photos folder ID" value={form.photos_drive_folder_id} onChange={v => setForm({ ...form, photos_drive_folder_id: v })} /><Input label="Second photos folder ID" value={form.photos_drive_folder_id_2} onChange={v => setForm({ ...form, photos_drive_folder_id_2: v })} />
    <Input label="Videos folder ID" value={form.videos_drive_folder_id} onChange={v => setForm({ ...form, videos_drive_folder_id: v })} /><Input label="Second videos folder ID" value={form.videos_drive_folder_id_2} onChange={v => setForm({ ...form, videos_drive_folder_id_2: v })} />
    <Input label="Venue name" value={form.venue_name} onChange={v => setForm({ ...form, venue_name: v })} /><Input label="Venue address" value={form.venue_address} onChange={v => setForm({ ...form, venue_address: v })} /><div className="md:col-span-2"><Input label="Google Maps URL" value={form.maps_url} onChange={v => setForm({ ...form, maps_url: v })} /></div>
    <Toggle label="Active" value={form.is_active} onChange={v => setForm({ ...form, is_active: v })} /><Toggle label="Photos enabled" value={form.photos_enabled} onChange={v => setForm({ ...form, photos_enabled: v })} /><Toggle label="Videos enabled" value={form.videos_enabled} onChange={v => setForm({ ...form, videos_enabled: v })} /><Toggle label="Slideshow enabled" value={form.slideshow_enabled} onChange={v => setForm({ ...form, slideshow_enabled: v })} /><Toggle label="QR enabled" value={form.qr_enabled} onChange={v => setForm({ ...form, qr_enabled: v })} />
  </div><div className="mt-5 flex flex-wrap gap-2"><Button primary onClick={() => void save()}><Check size={16} />Save event</Button>{selected && <Button danger onClick={() => void remove()}><Trash2 size={15} />Delete</Button>}</div></Card></div>;
  return <Card title="Event management"><Empty text="Choose an event child panel above to manage the selected event data." /></Card>;
}

function GuestbookPanel({ token, guestbook, setGuestbook, child, notify }: any) {
  const rows = guestbook.filter((g: any) => child === "pending" ? g.moderation_status === "pending" : child === "approved" ? g.moderation_status === "approved" || g.approved : child === "rejected" ? g.moderation_status === "rejected" : child === "spam" ? g.moderation_status === "spam" : true);
  const moderate = async (id: string, status: any) => { try { await setGuestbookModeration(token, id, status); setGuestbook(guestbook.map((g: any) => g.id === id ? { ...g, moderation_status: status, approved: status === "approved" } : g)); notify(`Message ${status}.`); } catch (e) { notify(e instanceof Error ? e.message : "Moderation failed"); } };
  const feature = async (id: string, value: boolean) => { try { await setGuestbookFeatured(token, id, value); setGuestbook(guestbook.map((g: any) => g.id === id ? { ...g, featured: value } : g)); notify(value ? "Featured." : "Unfeatured."); } catch (e) { notify(e instanceof Error ? e.message : "Feature update failed"); } };
  const remove = async (id: string) => { if (!window.confirm("Delete this guestbook message permanently?")) return; try { await deleteGuestbookMessage(token, id); setGuestbook(guestbook.filter((g: any) => g.id !== id)); notify("Message deleted."); } catch (e) { notify(e instanceof Error ? e.message : "Delete failed"); } };
  return <Card title={`Guestbook · ${child.replaceAll("-", " ")}`}><div className="space-y-3">{rows.map((g: any) => <div key={g.id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{g.name}</b><div className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleString()}</div></div><span className="rounded-full border px-2 py-1 text-xs">{g.moderation_status || (g.approved ? "approved" : "pending")}</span></div><p className="mt-3 whitespace-pre-wrap text-sm">{g.message}</p><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void moderate(g.id, "approved")}><Check size={15} />Approve</Button><Button onClick={() => void moderate(g.id, "rejected")}>Reject</Button><Button onClick={() => void moderate(g.id, "spam")}>Spam</Button><Button onClick={() => void feature(g.id, !g.featured)}><Heart size={15} />{g.featured ? "Unfeature" : "Feature"}</Button><Button danger onClick={() => void remove(g.id)}><Trash2 size={15} />Delete</Button></div></div>)}{!rows.length && <Empty text="No messages match this filter." />}</div></Card>;
}

function NotificationsPanel({ token, notifications, setNotifications, child, notify }: any) {
  const [form, setForm] = useState({ type: child === "security" ? "security" : "system", title: "", message: "", target: "public" });
  const create = async () => { try { if (!form.title || !form.message) throw new Error("Title and message are required."); const data = await createNotification(token, form); setNotifications([...(data || []), ...notifications]); await writeAdminAudit(token, "create_notification"); notify("Notification created."); } catch (e) { notify(e instanceof Error ? e.message : "Notification creation failed"); } };
  const remove = async (id: string) => { try { await deleteNotification(token, id); setNotifications(notifications.filter((n: any) => n.id !== id)); notify("Notification deleted."); } catch (e) { notify(e instanceof Error ? e.message : "Delete failed"); } };
  return <div className="grid gap-5 lg:grid-cols-[380px_1fr]"><Card title="Create notification"><div className="space-y-4"><Select label="Type" value={form.type} onChange={v => setForm({ ...form, type: v })} options={["system", "guestbook", "admin", "security", "email"]} /><Input label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} /><Textarea label="Message" value={form.message} onChange={v => setForm({ ...form, message: v })} /><Select label="Target" value={form.target} onChange={v => setForm({ ...form, target: v })} options={["public", "landing", "all", "admin"]} /><Button primary onClick={() => void create()}><Plus size={15} />Create</Button></div></Card><Card title="Notification center"><div className="space-y-2">{notifications.map((n: any) => <div key={n.id} className="flex gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><b>{n.title}</b><p className="text-sm text-muted-foreground">{n.message}</p><span className="text-xs text-muted-foreground">{n.type} · {n.target || "public"}</span></div><Button danger onClick={() => void remove(n.id)}><Trash2 size={15} /></Button></div>)}{!notifications.length && <Empty text="No notifications." />}</div></Card></div>;
}

function AnalyticsPanel({ analytics, child }: any) { return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric title="Visitors" value={analytics.total || 0} /><Metric title="Gallery views" value={analytics.galleryViews || 0} /><Metric title="Reactions" value={analytics.reactionTotal || 0} /><Metric title="Events viewed" value={analytics.eventViews || 0} /><Card title={child.replaceAll("-", " ")}><pre className="max-h-96 overflow-auto rounded-xl bg-muted p-4 text-xs">{JSON.stringify(analytics, null, 2)}</pre></Card></div>; }
function Metric({ title, value }: { title: string; value: any }) { return <div className="rounded-2xl border bg-card p-5"><div className="text-xs text-muted-foreground">{title}</div><div className="mt-2 text-3xl font-semibold">{value}</div></div>; }
function AuditPanel({ audit, child }: any) { const rows = child === "all-activity" ? audit : audit.filter((x: any) => String(x.action || "").toLowerCase().includes(child.replace("-changes", "").replace("-activity", "").replace("-history", ""))); return <Card title={`Audit · ${child.replaceAll("-", " ")}`}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Time</th><th className="p-2">Action</th><th className="p-2">Target</th><th className="p-2">Details</th></tr></thead><tbody>{rows.map((x: any, i: number) => <tr key={x.id || i} className="border-b"><td className="p-2 whitespace-nowrap">{x.created_at ? new Date(x.created_at).toLocaleString() : "—"}</td><td className="p-2">{x.action || "—"}</td><td className="p-2">{x.target_id || "—"}</td><td className="p-2 max-w-md truncate">{JSON.stringify(x.details || {})}</td></tr>)}</tbody></table></div>{!rows.length && <Empty text="No audit entries." />}</Card>; }

function SecurityPanel({ token, events, child, notify }: any) {
  const [codes, setCodes] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [newCode, setNewCode] = useState("");
  const load = async () => { setLoading(true); try { setCodes(await getEventSecurityCodes(token)); } catch (e) { notify(e instanceof Error ? e.message : "Unable to load codes"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [token]);
  const setOne = async (event: any) => { const code = window.prompt(`New security code for ${event.title}`, ""); if (!code) return; try { await changeEventSecurityCode(token, event, code); notify("Event code changed."); void load(); } catch (e) { notify(e instanceof Error ? e.message : "Code change failed"); } };
  const setAll = async () => { if (!newCode || newCode.length < 4) { notify("Use a security code of at least 4 characters."); return; } try { await changeAllEventSecurityCodes(token, newCode); setNewCode(""); notify("All event security codes changed."); void load(); } catch (e) { notify(e instanceof Error ? e.message : "Code change failed"); } };
  return <div className="space-y-5"><Card title="Security overview"><div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border p-4"><b>{child.replaceAll("-", " ")}</b><p className="text-sm text-muted-foreground">Admin authentication, sessions and event access controls are managed here.</p></div><div className="rounded-xl border p-4"><b>Configured event codes</b><p className="text-2xl font-semibold">{codes.length}</p></div></div></Card><Card title="Event access codes" action={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={15} />Refresh</Button>}><div className="mb-4 flex flex-wrap gap-2"><Input label="New code for all events" value={newCode} onChange={setNewCode} placeholder="Minimum 4 characters" /><Button primary onClick={() => void setAll()}><KeyRound size={15} />Change all</Button></div><div className="space-y-2">{codes.map(c => <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><b>{c.title}</b><div className="text-xs text-muted-foreground">/{c.slug}</div></div><span className="text-xs">{c.code ? "Configured" : "Not configured"}</span><Button onClick={() => void setOne(c)}>Change</Button></div>)}{!codes.length && <Empty text="No event security codes returned." />}</div></Card></div>;
}

function AdministrationPanel({ token, child, notify }: any) {
  const [profiles, setProfiles] = useState<any[]>([]); const [sessions, setSessions] = useState<any[]>([]); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { if (child === "sessions" || child === "access-management") { const r = await fetch("/api/admin-users?action=list_sessions", { headers: { Authorization: `Bearer ${token}` } }); const d = await r.json(); setSessions(d.sessions || d || []); } const p = await supabaseRest<any[]>("profiles", { token, query: "select=id,username,display_name,role,created_at,updated_at&order=created_at.asc" }); setProfiles(p || []); } catch (e) { notify(e instanceof Error ? e.message : "Administration data unavailable"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [token, child]);
  const updateProfile = async (p: any) => { const role = window.prompt("Role (admin/editor/viewer)", p.role || "viewer"); if (!role) return; const username = window.prompt("Username", p.username || "") ?? p.username; const display = window.prompt("Display name", p.display_name || "") ?? p.display_name; try { await supabaseRest("rpc/admin_update_profile", { method: "POST", token, body: { p_user_id: p.id, p_role: role, p_username: username, p_display_name: display } }); notify("Profile updated."); void load(); } catch (e) { notify(e instanceof Error ? e.message : "Profile update failed"); } };
  return <div className="space-y-5"><Card title={`Administration · ${child.replaceAll("-", " ")}`} action={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={15} />Refresh</Button>}><div className="space-y-2">{profiles.map(p => <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><b>{p.display_name || p.username || "Unnamed admin"}</b><div className="text-xs text-muted-foreground">{p.username || p.id}</div></div><span className="rounded-full border px-2 py-1 text-xs">{p.role || "viewer"}</span><Button onClick={() => void updateProfile(p)}><UserCog size={15} />Edit role/profile</Button></div>)}{!profiles.length && <Empty text="No profiles available." />}</div></Card>{(child === "sessions" || child === "access-management") && <Card title="Active admin sessions"><div className="space-y-2">{sessions.map((s: any) => <div key={s.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><b>{s.username || s.user_id}</b><span className="text-xs">{s.revoked_at ? "Revoked" : "Active"}</span></div><div className="text-xs text-muted-foreground">{s.device || "Unknown device"} · last seen {s.last_seen_at ? new Date(s.last_seen_at).toLocaleString() : "—"}</div></div>)}{!sessions.length && <Empty text="No sessions returned." />}</div></Card>}</div>;
}

function BackupPanel({ token, events, sections, settings, notify }: any) {
  const make = () => { const payload = { schema: 1, created_at: new Date().toISOString(), events, sections, settings }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `wedding-admin-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href); notify("Backup exported."); };
  const importBackup = async (file: File) => { try { const data = JSON.parse(await file.text()); if (!data || data.schema !== 1) throw new Error("Unsupported backup format."); if (Array.isArray(data.sections)) await updateHomepageSections(token, data.sections); if (data.settings && typeof data.settings === "object") { for (const [k, v] of Object.entries(data.settings)) await saveSiteSetting(token, k, v); } notify("Backup configuration restored. Refresh admin to verify."); } catch (e) { notify(e instanceof Error ? e.message : "Restore failed"); } };
  return <div className="grid gap-5 lg:grid-cols-2"><Card title="Backup & Restore"><p className="text-sm text-muted-foreground">Exports configuration and homepage structure. Authentication secrets are never included.</p><div className="mt-4 flex flex-wrap gap-2"><Button primary onClick={make}><Download size={15} />Create / export backup</Button><label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium hover:bg-muted"><FileArchive size={15} />Import backup<input type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void importBackup(f); e.currentTarget.value = ""; }} /></label></div></Card><Card title="Recovery rules"><ul className="space-y-2 text-sm"><li>✓ Export contains settings, events and homepage section configuration.</li><li>✓ Auth passwords, access tokens and service secrets are excluded.</li><li>✓ Imported settings are written through the authenticated admin API.</li><li>✓ Review the public site after restore before publishing.</li></ul></Card></div>;
}

function QrPanel({ child, notify }: any) { const [value, setValue] = useState(window.location.origin); const src = `https://quickchart.io/qr?size=500&text=${encodeURIComponent(value)}`; const download = async () => { const r = await fetch(src); const b = await r.blob(); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `wedding-${child}-qr.png`; a.click(); URL.revokeObjectURL(a.href); notify("QR downloaded."); }; return <Card title={`QR Code · ${child}`}><div className="grid gap-6 md:grid-cols-2 md:items-center"><div className="space-y-4"><Input label="URL or text" value={value} onChange={setValue} /><p className="text-xs text-muted-foreground">The QR is generated from the exact value above.</p><Button primary onClick={() => void download()}><Download size={15} />Download PNG</Button></div><div className="grid place-items-center rounded-2xl border bg-white p-5"><img src={src} alt="Generated QR code" className="h-64 w-64" /></div></div></Card>; }

function LocationsPanel({ token, events, notify, child }: any) { const [selected, setSelected] = useState(events[0]); const [venue, setVenue] = useState<any>({}); useEffect(() => setVenue(selected || {}), [selected?.id]); const save = async () => { if (!selected) return; try { await supabaseRest("events", { method: "PATCH", token, query: `id=eq.${encodeURIComponent(selected.id)}`, body: { venue_name: venue.venue_name, venue_address: venue.venue_address, maps_url: venue.maps_url }, prefer: "return=minimal" }); notify("Location saved."); } catch (e) { notify(e instanceof Error ? e.message : "Location save failed"); } }; return <div className="grid gap-5 lg:grid-cols-[300px_1fr]"><Card title="Events"><div className="space-y-2">{events.map((e: any) => <button key={e.id} type="button" onClick={() => setSelected(e)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === e.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>{e.title}</button>)}</div></Card><Card title={`Location · ${child.replaceAll("-", " ")}`}>{selected ? <div className="space-y-4"><Input label="Venue name" value={venue.venue_name} onChange={v => setVenue({ ...venue, venue_name: v })} /><Textarea label="Venue address" value={venue.venue_address} onChange={v => setVenue({ ...venue, venue_address: v })} /><Input label="Google Maps URL" value={venue.maps_url} onChange={v => setVenue({ ...venue, maps_url: v })} /><div className="flex flex-wrap gap-2"><Button primary onClick={() => void save()}><Check size={15} />Save location</Button>{venue.maps_url && <Button onClick={() => window.open(venue.maps_url, "_blank", "noopener,noreferrer")}><MapPin size={15} />Open Maps</Button>}</div></div> : <Empty text="Create an event first." />}</Card></div>; }

function PublishingPanel({ token, child, notify }: any) { const [revisions, setRevisions] = useState<any[]>([]); const [loading, setLoading] = useState(false); const load = async () => { setLoading(true); try { setRevisions(await supabaseRest<any[]>("admin_revision_summary", { token, query: "select=*&order=version_no.desc&limit=50" })); } catch (e) { notify(e instanceof Error ? e.message : "Unable to load revisions"); } finally { setLoading(false); } }; useEffect(() => { void load(); }, [token]); const rollback = async (id: string) => { if (!window.confirm("Rollback to this revision?")) return; try { await supabaseRest("rpc/admin_rollback_revision", { method: "POST", token, body: { p_revision_id: id } }); notify("Rollback completed."); void load(); } catch (e) { notify(e instanceof Error ? e.message : "Rollback failed"); } }; return <Card title={`Publishing · ${child}`} action={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={15} />Refresh</Button>}><div className="space-y-2">{revisions.map(r => <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><b>Version {r.version_no}</b><div className="text-xs text-muted-foreground">{r.label || "Revision"} · {r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div></div><span className="text-xs">{r.status}</span>{child === "rollback" && <Button onClick={() => void rollback(r.id)}><RefreshCw size={15} />Rollback</Button>}</div>)}{!revisions.length && <Empty text="No revisions found." />}</div></Card>; }

function DiagnosticsPanel({ health, child, notify }: any) { const [checks, setChecks] = useState<any[]>([]); const run = async () => { const list: any[] = []; try { const r = await fetch("/api/event-security-status", { cache: "no-store" }); list.push({ name: "Event security API", ok: r.ok }); } catch { list.push({ name: "Event security API", ok: false }); } list.push({ name: "Public homepage", ok: true }); list.push({ name: "Admin authorization", ok: health.some((x: Health) => x.label === "Admin authorization" && x.status === "ok") }); setChecks(list); notify("Diagnostics completed."); }; return <Card title={`Diagnostics · ${child.replaceAll("-", " ")}`} action={<Button primary onClick={() => void run()}><Activity size={15} />Run checks</Button>}><div className="space-y-2">{checks.map(x => <div key={x.name} className="flex items-center gap-3 rounded-xl border p-3"><span>{x.ok ? "✓" : "✕"}</span><b>{x.name}</b></div>)}{!checks.length && <Empty text="Run diagnostics to check the current production configuration." />}</div></Card>; }

function TrashPanel({ child, notify }: any) { return <Card title={`Trash & Recovery · ${child.replaceAll("-", " ")}`}><Empty text="This installation currently has no soft-delete/trash table. Destructive records are therefore not presented as recoverable items. Use backups before permanent deletion." /></Card>; }
function HelpPanel({ child }: any) { return <Card title={`Help & Support · ${child.replaceAll("-", " ")}`}><div className="space-y-4 text-sm"><p>Use the left navigation to configure wedding content, media, security, publishing and system settings.</p><div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border p-4"><b>Safe workflow</b><p className="mt-1 text-muted-foreground">Edit → save → Preview → run diagnostics → Publish.</p></div><div className="rounded-xl border p-4"><b>Recovery</b><p className="mt-1 text-muted-foreground">Create a backup before large changes or restores.</p></div></div></div></Card>; }
function SystemPanel({ child, health }: any) { return <Card title={`System · ${child.replaceAll("-", " ")}`}><div className="space-y-2">{health.map(h => <div key={h.label} className="flex items-center gap-3 rounded-xl border p-3"><span className={`h-2 w-2 rounded-full ${h.status === "ok" ? "bg-emerald-500" : h.status === "warn" ? "bg-amber-500" : "bg-red-500"}`} /><div><b>{h.label}</b><div className="text-xs text-muted-foreground">{h.detail}</div></div></div>)}</div></Card>; }
function IntegrationsPanel({ child, settings }: any) { const keys = ["supabase", "google-drive", "google-maps", "youtube", "instagram", "facebook", "whatsapp", "vercel"]; return <Card title={`Integration · ${child}`}><div className="grid gap-3 md:grid-cols-2">{keys.map(k => <div key={k} className="rounded-xl border p-4"><b>{k.replaceAll("-", " ")}</b><div className="mt-1 text-xs text-muted-foreground">{settings[`integrations.${k}.status`] || "Configured through environment / backend"}</div></div>)}</div></Card>; }
function InteractionsPanel({ child, analytics }: any) { return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Metric title="Favorites" value={analytics.favoriteTotal || 0} /><Metric title="Reactions" value={analytics.reactionTotal || 0} /><Metric title="Shares" value={analytics.shareTotal || 0} /></div><Card title={`Interactions · ${child}`}><p className="text-sm text-muted-foreground">Favorites are currently device-local. Reaction/share counters shown here use the available analytics data.</p></Card></div>; }
