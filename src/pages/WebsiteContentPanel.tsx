import { useEffect, useState } from "react";
import { Check, Eye, ExternalLink, RefreshCw } from "lucide-react";
import { saveSiteSetting, writeAdminAudit } from "@/lib/supabaseData";

type Settings = Record<string, any>;
type Child = "home" | "couple" | "story" | "gallery" | "rsvp" | "footer" | "navigation";
const PREVIEW_KEY = "wedding-admin-preview-snapshot-v1";
const driveFileUrl = (value?: string) => { const v = String(value || "").trim(); if (!v) return ""; const match = v.match(/(?:\/d\/|id=|file\/d\/)([a-zA-Z0-9_-]{10,})/); const id = match?.[1] || v; return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`; };
const driveThumbUrl = (value?: string) => { const v = String(value || "").trim(); if (!v) return ""; const match = v.match(/(?:\/d\/|id=|file\/d\/)([a-zA-Z0-9_-]{10,})/); const id = match?.[1] || v; return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`; };

const defaults: Settings = {
  groomName: "Hareesh Kumar", brideName: "Prasanna", heroTitle: "We Are Married", description: "", heroSubtitle: "", date: "2026-04-04", time: "08:59 AM", timezone: "Asia/Kolkata", countdownEnabled: true, heroImageDriveId: "", shareEnabled: true, sharePosition: "left", groomImageDriveId: "", groomImagePosition: "center", brideImageDriveId: "", brideImagePosition: "center", storyTitle: "Our Journey", storyDescription: "A collection of beautiful moments from our journey", galleryHeading: "Sweet Memories", galleryDescription: "Our Captured Moments", rsvpHeading: "RSVP", rsvpDescription: "Your presence would mean the world to us.", rsvpMaxGuests: 8, rsvpShowEmail: true, rsvpShowPhone: true, rsvpShowGuestCount: true, rsvpShowMessage: true, rsvpRequireEmail: false, rsvpRequirePhone: false, rsvpYesText: "Yes, I'll be there ❤️", rsvpNoText: "Sorry, I can't", rsvpSubmitText: "Confirm RSVP", rsvpSuccessTitle: "Thank you!", rsvpSuccessMessage: "We look forward to celebrating with you.", footerText: "Made with love for our special day", footerCopyright: "", footerShowSocial: true, navigationSticky: true, navigationHome: true, navigationEvents: true, navigationGuestbook: false,
};

const groups: Record<Child, { title: string; description: string; fields: { key: string; label: string; type?: "text" | "textarea" | "date" | "time" | "number" | "toggle" | "select" | "drive-image"; options?: string[]; help?: string }[] }[]> = {
  home: [{ title: "Home / Hero", description: "Edit Home content. Section visibility and order are controlled by Section Manager.", fields: [{ key: "heroTitle", label: "Hero title" }, { key: "groomName", label: "Groom name" }, { key: "brideName", label: "Bride name" }, { key: "description", label: "Hero description", type: "textarea" }, { key: "heroSubtitle", label: "Hero subtitle" }, { key: "date", label: "Wedding date", type: "date" }, { key: "time", label: "Wedding time", type: "text", help: "Use 24-hour time or AM/PM, for example 08:59 AM." }, { key: "timezone", label: "Timezone", type: "select", options: ["Asia/Kolkata", "UTC", "Asia/Dubai", "Asia/Singapore"] }, { key: "countdownEnabled", label: "Show countdown", type: "toggle" }, { key: "heroImageDriveId", label: "Cover image Google Drive ID", type: "drive-image", help: "Paste only the Drive file ID. You can preview it and check the Drive URL before saving." }, { key: "shareEnabled", label: "Show share button", type: "toggle" }, { key: "sharePosition", label: "Share button position", type: "select", options: ["left", "right"] }] }],
  couple: [{ title: "Couple", description: "Couple data used by the public Couple section. Social links are managed separately.", fields: [{ key: "groomName", label: "Groom name" }, { key: "groomImageDriveId", label: "Groom photo Google Drive ID", type: "drive-image", help: "Paste the Google Drive file ID. Preview and Check URL work before you save." }, { key: "groomImagePosition", label: "Groom photo position", type: "select", options: ["center", "top", "bottom", "left", "right"] }, { key: "brideName", label: "Bride name" }, { key: "brideImageDriveId", label: "Bride photo Google Drive ID", type: "drive-image", help: "Paste the Google Drive file ID. Preview and Check URL work before you save." }, { key: "brideImagePosition", label: "Bride photo position", type: "select", options: ["center", "top", "bottom", "left", "right"] }] }],
  story: [{ title: "Story", description: "Timeline cards come from Events. This panel controls Story content.", fields: [{ key: "storyTitle", label: "Story title" }, { key: "storyDescription", label: "Story description", type: "textarea" }] }],
  gallery: [{ title: "Gallery", description: "The main page shows the Gallery introduction. Photos and videos stay inside event galleries.", fields: [{ key: "galleryHeading", label: "Gallery heading" }, { key: "galleryDescription", label: "Gallery description", type: "textarea" }] }],
  rsvp: [{ title: "RSVP", description: "Control the public RSVP form without changing RSVP response data.", fields: [{ key: "rsvpHeading", label: "Heading" }, { key: "rsvpDescription", label: "Description", type: "textarea" }, { key: "rsvpMaxGuests", label: "Maximum guests", type: "number", help: "Allowed range is 1–10." }, { key: "rsvpShowEmail", label: "Show email", type: "toggle" }, { key: "rsvpRequireEmail", label: "Require email", type: "toggle" }, { key: "rsvpShowPhone", label: "Show phone", type: "toggle" }, { key: "rsvpRequirePhone", label: "Require phone", type: "toggle" }, { key: "rsvpShowGuestCount", label: "Show guest count", type: "toggle" }, { key: "rsvpShowMessage", label: "Show message", type: "toggle" }, { key: "rsvpYesText", label: "Yes button text" }, { key: "rsvpNoText", label: "No button text" }, { key: "rsvpSubmitText", label: "Submit button text" }, { key: "rsvpSuccessTitle", label: "Success title" }, { key: "rsvpSuccessMessage", label: "Success message", type: "textarea" }] }],
  footer: [{ title: "Footer", description: "Footer content. Social URLs remain managed by Social & Contact.", fields: [{ key: "footerText", label: "Footer text" }, { key: "footerCopyright", label: "Copyright text" }, { key: "footerShowSocial", label: "Show social icons", type: "toggle" }] }],
  navigation: [{ title: "Navigation", description: "Navigation display settings. Section visibility and order are controlled by Section Manager; this panel only controls navigation behavior.", fields: [{ key: "navigationSticky", label: "Sticky navigation", type: "toggle" }, { key: "navigationHome", label: "Show Home", type: "toggle" }, { key: "navigationEvents", label: "Show Events / Story link", type: "toggle" }, { key: "navigationGuestbook", label: "Show Guestbook link", type: "toggle" }] }],
};

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p><div className="mt-5">{children}</div></section>; }

function DriveImageField({ label, value, onChange, help }: { label: string; value: any; onChange: (value: string) => void; help?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = String(value || "").trim();
  const previewUrl = driveThumbUrl(id);
  const fileUrl = driveFileUrl(id);
  useEffect(() => { setLoaded(false); setFailed(false); }, [id]);
  return <div className="md:col-span-2 rounded-2xl border bg-background p-4">
    <label className="block text-sm font-medium"><span>{label}</span><input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Google Drive file ID" className="mt-1 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/20" /></label>
    {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      {fileUrl && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium hover:bg-muted"><ExternalLink size={15}/>Check URL</a>}
      {id && <button type="button" onClick={() => { setFailed(false); setLoaded(false); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium hover:bg-muted"><RefreshCw size={15}/>Refresh preview</button>}
    </div>
    {id ? <div className="mt-4 overflow-hidden rounded-2xl border bg-muted/20">
      <div className="flex min-h-48 items-center justify-center p-3">
        {!failed ? <img src={previewUrl} alt={`${label} preview`} loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="max-h-80 w-full rounded-xl object-contain" /> : <div className="p-8 text-center text-sm text-muted-foreground">Preview unavailable. Use <b>Check URL</b> to verify that the Drive file is accessible.</div>}
        {!loaded && !failed && <span className="absolute sr-only">Loading preview…</span>}
      </div>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">Drive ID: <span className="font-mono">{id}</span></div>
    </div> : <div className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Paste a Google Drive file ID to see the preview and URL check option.</div>}
  </div>;
}

export default function WebsiteContentPanel({ child, token, settings, setSettings, notify }: { child: Child; token: string; settings: Settings; setSettings: (v: any) => void; notify: (message: string) => void }) {
  const [draft, setDraft] = useState<Settings>({ ...defaults, ...(settings.wedding || {}) });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setDraft({ ...defaults, ...(settings.wedding || {}) }); setDirty(false); }, [settings.wedding]);
  const set = (key: string, value: any) => { setDraft((d) => ({ ...d, [key]: value })); setDirty(true); };
  const save = async () => {
    if (!token) return notify("Admin session is missing.");
    setSaving(true);
    try {
      const next = { ...defaults, ...(settings.wedding || {}), ...draft, rsvpMaxGuests: Math.min(10, Math.max(1, Number(draft.rsvpMaxGuests || 8))) };
      await saveSiteSetting(token, "wedding", next);
      setSettings((s: Settings) => ({ ...s, wedding: next }));
      await writeAdminAudit(token, "update_settings", "wedding", { panel: `website.${child}`, workflow: "draft" });
      setDraft(next); setDirty(false); notify("Website settings saved to draft.");
    } catch (error) { notify(error instanceof Error ? error.message : "Unable to save website settings."); }
    finally { setSaving(false); }
  };
  const reset = () => { setDraft({ ...defaults, ...(settings.wedding || {}) }); setDirty(false); };
  const preview = async () => {
    try {
      const response = await fetch("/api/admin-advanced?action=draft", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ label: `Preview ${child} ${new Date().toLocaleString()}` }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to create preview draft.");
      localStorage.setItem(PREVIEW_KEY, JSON.stringify({ revision_id: data.revision.id, snapshot: data.revision.snapshot, created_at: new Date().toISOString() }));
      window.open("/?preview=draft", "_blank", "noopener,noreferrer");
    } catch (error) { notify(error instanceof Error ? error.message : "Preview failed."); }
  };
  const group = groups[child]?.[0] || groups.home[0];
  return <div className="space-y-5">
    <Card title={group.title} description={group.description}>
      <div className="grid gap-4 md:grid-cols-2">
        {group.fields.map((field) => field.type === "drive-image" ? <DriveImageField key={field.key} label={field.label} value={draft[field.key]} onChange={(value) => set(field.key, value)} help={field.help} />
          : field.type === "toggle" ? <label key={field.key} className="flex min-h-12 items-center justify-between gap-4 rounded-xl border p-3 text-sm font-medium"><span>{field.label}</span><input type="checkbox" checked={Boolean(draft[field.key])} onChange={(e) => set(field.key, e.target.checked)} /></label>
          : field.type === "textarea" ? <label key={field.key} className="block text-sm font-medium md:col-span-2"><span>{field.label}</span><textarea value={draft[field.key] ?? ""} onChange={(e) => set(field.key, e.target.value)} className="mt-1 min-h-28 w-full rounded-xl border bg-background p-3 outline-none focus:ring-2 focus:ring-primary/20" />{field.help && <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.help}</span>}</label>
          : field.type === "select" ? <label key={field.key} className="block text-sm font-medium"><span>{field.label}</span><select value={draft[field.key] ?? ""} onChange={(e) => set(field.key, e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3">{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>{field.help && <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.help}</span>}</label>
          : <label key={field.key} className="block text-sm font-medium"><span>{field.label}</span><input type={field.type || "text"} min={field.type === "number" ? 1 : undefined} max={field.type === "number" ? 10 : undefined} value={draft[field.key] ?? ""} onChange={(e) => set(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/20" />{field.help && <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.help}</span>}</label>)}
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
        <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"><Check size={15}/>{saving ? "Saving…" : "Save Draft"}</button>
        <button type="button" onClick={reset} disabled={!dirty || saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium disabled:opacity-50"><RefreshCw size={15}/>Reset</button>
        <button type="button" onClick={() => void preview()} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium"><Eye size={15}/>Preview Draft</button>
      </div>
    </Card>
    <div className="rounded-2xl border border-dashed p-4 text-xs text-muted-foreground">Save updates the draft workspace only. The public website reads the last published snapshot until Publish is pressed.</div>
  </div>;
}
