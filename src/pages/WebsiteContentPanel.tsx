import { useEffect, useState } from "react";
import { Check, Eye, RefreshCw } from "lucide-react";
import { saveSiteSetting, writeAdminAudit } from "@/lib/supabaseData";

type Settings = Record<string, any>;
type Child = "home" | "couple" | "story" | "gallery" | "rsvp" | "footer" | "navigation";

const defaults: Settings = {
  homeEnabled: true,
  groomName: "Hareesh Kumar",
  brideName: "Prasanna",
  heroTitle: "We Are Married",
  description: "",
  heroSubtitle: "",
  date: "2026-04-04",
  time: "08:59 AM",
  timezone: "Asia/Kolkata",
  countdownEnabled: true,
  heroImageDriveId: "",
  shareEnabled: true,
  sharePosition: "left",
  coupleEnabled: true,
  groomImageDriveId: "",
  groomImagePosition: "center",
  brideImageDriveId: "",
  brideImagePosition: "center",
  storyEnabled: true,
  storyTitle: "Our Journey",
  storyDescription: "A collection of beautiful moments from our journey",
  galleryEnabled: true,
  galleryHeading: "Sweet Memories",
  galleryDescription: "Our Captured Moments",
  rsvpEnabled: true,
  rsvpHeading: "RSVP",
  rsvpDescription: "Your presence would mean the world to us.",
  rsvpMaxGuests: 8,
  rsvpShowEmail: true,
  rsvpShowPhone: true,
  rsvpShowGuestCount: true,
  rsvpShowMessage: true,
  rsvpRequireEmail: false,
  rsvpRequirePhone: false,
  rsvpYesText: "Yes, I'll be there ❤️",
  rsvpNoText: "Sorry, I can't",
  rsvpSubmitText: "Confirm RSVP",
  rsvpSuccessTitle: "Thank you!",
  rsvpSuccessMessage: "We look forward to celebrating with you.",
  footerEnabled: true,
  footerText: "Made with love for our special day",
  footerCopyright: "",
  footerShowSocial: true,
  navigationSticky: true,
  navigationHome: true,
  navigationEvents: true,
  navigationGuestbook: false,
};

const groups: Record<Child, { title: string; description: string; fields: { key: string; label: string; type?: "text" | "textarea" | "date" | "time" | "number" | "toggle" | "select"; options?: string[]; help?: string }[] }[]> = {
  home: [{ title: "Hero content", description: "These values are read directly by the public homepage hero.", fields: [
    { key: "homeEnabled", label: "Show Home / Hero", type: "toggle" },
    { key: "heroTitle", label: "Hero title" },
    { key: "groomName", label: "Groom name" },
    { key: "brideName", label: "Bride name" },
    { key: "description", label: "Hero description", type: "textarea" },
    { key: "heroSubtitle", label: "Hero subtitle" },
    { key: "date", label: "Wedding date", type: "date" },
    { key: "time", label: "Wedding time", type: "text", help: "Use 24-hour time or AM/PM, for example 08:59 AM." },
    { key: "timezone", label: "Timezone", type: "select", options: ["Asia/Kolkata", "UTC", "Asia/Dubai", "Asia/Singapore"] },
    { key: "countdownEnabled", label: "Show countdown", type: "toggle" },
    { key: "heroImageDriveId", label: "Hero image Google Drive ID", help: "Paste only the Drive file ID. Leave empty to use the built-in fallback image." },
    { key: "shareEnabled", label: "Show share button", type: "toggle" },
    { key: "sharePosition", label: "Share button position", type: "select", options: ["left", "right"] },
  ] }],
  couple: [{ title: "Couple", description: "Couple data used by the public Couple section. Social links are managed separately.", fields: [
    { key: "coupleEnabled", label: "Show Couple section", type: "toggle" },
    { key: "groomName", label: "Groom name" },
    { key: "groomImageDriveId", label: "Groom photo Google Drive ID" },
    { key: "groomImagePosition", label: "Groom photo position", type: "select", options: ["center", "top", "bottom", "left", "right"] },
    { key: "brideName", label: "Bride name" },
    { key: "brideImageDriveId", label: "Bride photo Google Drive ID" },
    { key: "brideImagePosition", label: "Bride photo position", type: "select", options: ["center", "top", "bottom", "left", "right"] },
  ] }],
  story: [{ title: "Story & timeline", description: "The timeline cards come from Events. This panel controls the Story section heading and visibility.", fields: [
    { key: "storyEnabled", label: "Show Story section", type: "toggle" },
    { key: "storyTitle", label: "Story subtitle" },
    { key: "storyDescription", label: "Story description", type: "textarea" },
  ] }],
  gallery: [{ title: "Gallery", description: "The main page shows the Gallery introduction. Photos and videos stay inside event galleries.", fields: [
    { key: "galleryEnabled", label: "Show Gallery section", type: "toggle" },
    { key: "galleryHeading", label: "Gallery heading" },
    { key: "galleryDescription", label: "Gallery description", type: "textarea" },
  ] }],
  rsvp: [{ title: "RSVP", description: "Control the public RSVP form without changing the RSVP response data.", fields: [
    { key: "rsvpEnabled", label: "Show RSVP section", type: "toggle" },
    { key: "rsvpHeading", label: "Heading" },
    { key: "rsvpDescription", label: "Description", type: "textarea" },
    { key: "rsvpMaxGuests", label: "Maximum guests", type: "number", help: "Allowed range is 1–10." },
    { key: "rsvpShowEmail", label: "Show email", type: "toggle" },
    { key: "rsvpRequireEmail", label: "Require email", type: "toggle" },
    { key: "rsvpShowPhone", label: "Show phone", type: "toggle" },
    { key: "rsvpRequirePhone", label: "Require phone", type: "toggle" },
    { key: "rsvpShowGuestCount", label: "Show guest count", type: "toggle" },
    { key: "rsvpShowMessage", label: "Show message", type: "toggle" },
    { key: "rsvpYesText", label: "Yes button text" },
    { key: "rsvpNoText", label: "No button text" },
    { key: "rsvpSubmitText", label: "Submit button text" },
    { key: "rsvpSuccessTitle", label: "Success title" },
    { key: "rsvpSuccessMessage", label: "Success message", type: "textarea" },
  ] }],
  footer: [{ title: "Footer", description: "Footer content. Social URLs remain managed by Social & Contact.", fields: [
    { key: "footerEnabled", label: "Show Footer", type: "toggle" },
    { key: "footerText", label: "Footer text" },
    { key: "footerCopyright", label: "Copyright text" },
    { key: "footerShowSocial", label: "Show social icons", type: "toggle" },
  ] }],
  navigation: [{ title: "Navigation", description: "These controls map directly to the public navigation component.", fields: [
    { key: "navigationSticky", label: "Sticky navigation", type: "toggle" },
    { key: "navigationHome", label: "Show Home", type: "toggle" },
    { key: "navigationEvents", label: "Show Events / Story link", type: "toggle" },
    { key: "navigationGuestbook", label: "Show Guestbook link", type: "toggle" },
  ] }],
};

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p><div className="mt-5">{children}</div></section>;
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
      await writeAdminAudit(token, "update_settings", "wedding", { panel: `website.${child}` });
      setDraft(next); setDirty(false); notify("Website settings saved successfully.");
    } catch (error) { notify(error instanceof Error ? error.message : "Unable to save website settings."); }
    finally { setSaving(false); }
  };
  const reset = () => { setDraft({ ...defaults, ...(settings.wedding || {}) }); setDirty(false); };
  const preview = () => {
    try { localStorage.setItem("wedding-admin-preview-draft", JSON.stringify({ wedding: draft })); } catch {}
    window.open("/?preview=draft", "_blank", "noopener,noreferrer");
  };
  return <div className="space-y-5">
    <Card title={groups[child][0].title} description={groups[child][0].description}>
      <div className="grid gap-4 md:grid-cols-2">
        {groups[child][0].fields.map((field) => field.type === "toggle" ? <label key={field.key} className="flex min-h-12 items-center justify-between gap-4 rounded-xl border p-3 text-sm font-medium"><span>{field.label}</span><input type="checkbox" checked={Boolean(draft[field.key])} onChange={(e) => set(field.key, e.target.checked)} /></label>
          : field.type === "textarea" ? <label key={field.key} className="block text-sm font-medium md:col-span-2"><span>{field.label}</span><textarea value={draft[field.key] ?? ""} onChange={(e) => set(field.key, e.target.value)} className="mt-1 min-h-28 w-full rounded-xl border bg-background p-3 outline-none focus:ring-2 focus:ring-primary/20" />{field.help && <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.help}</span>}</label>
          : field.type === "select" ? <label key={field.key} className="block text-sm font-medium"><span>{field.label}</span><select value={draft[field.key] ?? ""} onChange={(e) => set(field.key, e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3">{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>{field.help && <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.help}</span>}</label>
          : <label key={field.key} className="block text-sm font-medium"><span>{field.label}</span><input type={field.type || "text"} min={field.type === "number" ? 1 : undefined} max={field.type === "number" ? 10 : undefined} value={draft[field.key] ?? ""} onChange={(e) => set(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/20" />{field.help && <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.help}</span>}</label>)}
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
        <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"><Check size={15}/>{saving ? "Saving…" : "Save changes"}</button>
        <button type="button" onClick={reset} disabled={!dirty || saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium disabled:opacity-50"><RefreshCw size={15}/>Reset</button>
        <button type="button" onClick={preview} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium"><Eye size={15}/>Preview draft</button>
      </div>
    </Card>
    <div className="rounded-2xl border border-dashed p-4 text-xs text-muted-foreground">Changes are stored in the public <code>wedding</code> settings object used by the website. Event details, media, social URLs and section ordering are managed in their dedicated panels.</div>
  </div>;
}
