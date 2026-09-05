import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Eye, Save, X } from "lucide-react";
import { getAdminSettings, saveSiteSetting, writeAdminAudit } from "@/lib/supabaseData";

type Value = string | number | boolean;
type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "toggle"; help?: string; defaultValue?: Value };

const groups: Array<{ id: string; label: string; description: string; fields: Field[] }> = [
  { id: "home", label: "Home", description: "Hero content and homepage sharing.", fields: [
    { key: "website.home.title", label: "Hero title", defaultValue: "We Are Married" },
    { key: "website.home.description", label: "Hero description", type: "textarea", defaultValue: "The wedding story and memories of Hareesh & Prasanna." },
    { key: "website.home.show_countdown", label: "Show countdown", type: "toggle", defaultValue: true },
    { key: "website.home.show_share", label: "Show share button", type: "toggle", defaultValue: true },
    { key: "website.home.share_position", label: "Share button position", defaultValue: "left", help: "Use left or right." },
  ] },
  { id: "couple", label: "Couple", description: "Names shown in the public couple/hero content.", fields: [
    { key: "website.couple.groom", label: "Groom name", defaultValue: "Hareesh Kumar" },
    { key: "website.couple.bride", label: "Bride name", defaultValue: "Prasanna" },
  ] },
  { id: "story", label: "Story", description: "The public story section.", fields: [
    { key: "website.story.title", label: "Story title", defaultValue: "Our Journey" },
    { key: "website.story.content", label: "Story content", type: "textarea", defaultValue: "A collection of beautiful moments from our journey" },
    { key: "website.story.enabled", label: "Show story", type: "toggle", defaultValue: true },
  ] },
  { id: "gallery", label: "Gallery", description: "Controls the public gallery section and its event link.", fields: [
    { key: "website.gallery.title", label: "Gallery title", defaultValue: "Our Memories" },
    { key: "website.gallery.description", label: "Gallery description", type: "textarea" },
    { key: "website.gallery.enabled", label: "Show gallery", type: "toggle", defaultValue: true },
  ] },
  { id: "events", label: "Events", description: "Controls the public events heading and visibility.", fields: [
    { key: "website.events.title", label: "Events title", defaultValue: "Wedding Events" },
    { key: "website.events.description", label: "Events description", type: "textarea" },
    { key: "website.events.enabled", label: "Show events", type: "toggle", defaultValue: true },
  ] },
  { id: "rsvp", label: "RSVP", description: "Controls the public RSVP form fields and messages.", fields: [
    { key: "website.rsvp.title", label: "RSVP title", defaultValue: "Will you join us?" },
    { key: "website.rsvp.description", label: "RSVP description", type: "textarea" },
    { key: "website.rsvp.enabled", label: "Show RSVP", type: "toggle", defaultValue: true },
    { key: "website.rsvp.show_email", label: "Show email", type: "toggle", defaultValue: true },
    { key: "website.rsvp.show_phone", label: "Show phone", type: "toggle", defaultValue: true },
    { key: "website.rsvp.require_email", label: "Require email", type: "toggle", defaultValue: false },
    { key: "website.rsvp.require_phone", label: "Require phone", type: "toggle", defaultValue: false },
    { key: "website.rsvp.show_guest_count", label: "Show guest count", type: "toggle", defaultValue: true },
    { key: "website.rsvp.max_guests", label: "Maximum guests", type: "number", defaultValue: 10 },
    { key: "website.rsvp.show_message", label: "Show message", type: "toggle", defaultValue: true },
    { key: "website.rsvp.yes_text", label: "Attending text", defaultValue: "Yes, I'll be there" },
    { key: "website.rsvp.no_text", label: "Not attending text", defaultValue: "Sorry, I can't make it" },
    { key: "website.rsvp.submit_text", label: "Submit button text", defaultValue: "Send RSVP" },
    { key: "website.rsvp.success_title", label: "Success title", defaultValue: "Thank you!" },
    { key: "website.rsvp.success_message", label: "Success message", type: "textarea" },
  ] },
  { id: "guestbook", label: "Guestbook", description: "Controls public guestbook visibility and moderation display.", fields: [
    { key: "website.guestbook.title", label: "Guestbook title", defaultValue: "Leave a message" },
    { key: "website.guestbook.description", label: "Guestbook description", type: "textarea" },
    { key: "website.guestbook.enabled", label: "Show guestbook", type: "toggle", defaultValue: true },
    { key: "website.guestbook.allow_submission", label: "Allow submissions", type: "toggle", defaultValue: true },
    { key: "website.guestbook.show_messages", label: "Show approved messages", type: "toggle", defaultValue: true },
    { key: "website.guestbook.show_dates", label: "Show message dates", type: "toggle", defaultValue: true },
    { key: "website.guestbook.show_view_all", label: "Show view-all action", type: "toggle", defaultValue: true },
    { key: "website.guestbook.max_messages", label: "Messages shown", type: "number", defaultValue: 30 },
  ] },
  { id: "footer", label: "Footer", description: "Public footer text and social visibility.", fields: [
    { key: "website.footer.text", label: "Footer text", type: "textarea", defaultValue: "Made with love for our special day" },
    { key: "website.footer.show_social", label: "Show social links", type: "toggle", defaultValue: true },
  ] },
  { id: "navigation", label: "Navigation", description: "Public navigation behavior.", fields: [
    { key: "website.navigation.sticky", label: "Sticky navigation", type: "toggle", defaultValue: true },
    { key: "website.navigation.show_home", label: "Home link", type: "toggle", defaultValue: true },
    { key: "website.navigation.show_events", label: "Events link", type: "toggle", defaultValue: true },
    { key: "website.navigation.show_guestbook", label: "Guestbook link", type: "toggle", defaultValue: true },
  ] },
];

function Control({ field, value, onChange }: { field: Field; value: Value; onChange: (v: Value) => void }) {
  if (field.type === "toggle") return <label className="flex min-h-12 items-center justify-between gap-4 rounded-xl border bg-background p-3 text-sm"><span>{field.label}</span><input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} /></label>;
  if (field.type === "textarea") return <label className="block text-sm font-medium md:col-span-2"><span>{field.label}</span><textarea value={String(value ?? "")} onChange={e => onChange(e.target.value)} className="mt-1 min-h-28 w-full rounded-xl border bg-background p-3" />{field.help && <span className="mt-1 block text-xs text-muted-foreground">{field.help}</span>}</label>;
  return <label className="block text-sm font-medium"><span>{field.label}</span><input type={field.type === "number" ? "number" : "text"} value={String(value ?? "")} onChange={e => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3" />{field.help && <span className="mt-1 block text-xs text-muted-foreground">{field.help}</span>}</label>;
}

export default function WebsiteControlPanel({ token, onClose }: { token: string; onClose: () => void }) {
  const [active, setActive] = useState("home");
  const [saved, setSaved] = useState<Record<string, Value>>({});
  const [draft, setDraft] = useState<Record<string, Value>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const group = useMemo(() => groups.find(g => g.id === active) || groups[0], [active]);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  const defaults = () => Object.fromEntries(groups.flatMap(g => g.fields.map(f => [f.key, f.defaultValue ?? (f.type === "toggle" ? false : f.type === "number" ? 0 : "")])));
  useEffect(() => { let cancelled = false; (async () => { try { const rows = await getAdminSettings(token); const values = defaults(); for (const row of rows || []) values[row.key] = row.value as Value; if (!cancelled) { setSaved(values); setDraft(values); } } catch (e) { if (!cancelled) setMessage(e instanceof Error ? e.message : "Unable to load Website settings."); } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, [token]);

  const save = async () => { setSaving(true); setMessage(""); try { const changed = groups.flatMap(g => g.fields).filter(f => saved[f.key] !== draft[f.key]); for (const field of changed) await saveSiteSetting(token, field.key, draft[field.key]); await writeAdminAudit(token, "update_settings", "website", { changed: changed.map(f => f.key) }); setSaved(draft); setMessage(changed.length ? "Website changes saved." : "Nothing to save."); } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to save Website settings."); } finally { setSaving(false); } };
  const discard = () => { setDraft(saved); setMessage("Changes discarded."); };

  if (loading) return <div className="grid min-h-[40vh] place-items-center p-6 text-sm text-muted-foreground">Loading Website settings…</div>;
  return <div className="fixed inset-0 z-[120] bg-black/40 p-2 sm:p-4 md:p-6" role="dialog" aria-modal="true" aria-label="Website controls">
    <section className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl md:rounded-3xl">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-3 sm:px-5"><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold sm:text-xl">Website controls</h2><p className="hidden text-xs text-muted-foreground sm:block">Every setting below is connected to public website configuration.</p></div>{dirty && <span className="hidden rounded-full border px-3 py-1 text-xs font-medium sm:inline-flex">Unsaved changes</span>}<button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border hover:bg-muted" aria-label="Close"><X size={18}/></button></header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex shrink-0 gap-2 overflow-x-auto border-b p-2 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-3">{groups.map(g => <button key={g.id} type="button" onClick={() => setActive(g.id)} className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm ${active === g.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{g.label}</button>)}</nav>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 md:p-7"><div className="mb-5"><h3 className="text-xl font-semibold">{group.label}</h3><p className="mt-1 text-sm text-muted-foreground">{group.description}</p></div><div className="grid gap-4 md:grid-cols-2">{group.fields.map(f => <Control key={f.key} field={f} value={draft[f.key]} onChange={v => setDraft(d => ({ ...d, [f.key]: v }))} />)}</div></main>
      </div>
      <footer className="flex shrink-0 flex-col gap-2 border-t bg-background/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4"><div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">{message && <><Check size={14}/>{message}</>}</div><div className="flex gap-2 sm:justify-end"><button type="button" onClick={discard} disabled={!dirty || saving} className="min-h-10 flex-1 rounded-xl border px-3 text-sm disabled:opacity-50 sm:flex-none">Discard</button><button type="button" onClick={() => void save()} disabled={!dirty || saving} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:flex-none"><Save size={15}/>{saving ? "Saving…" : "Save changes"}</button></div></footer>
    </section>
  </div>;
}
