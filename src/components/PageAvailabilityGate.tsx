import { useEffect, useState } from "react";
import { getSiteSettings } from "@/lib/supabaseData";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";

const defaults = { mode: "all", pages: { gallery: true, videos: true, upload: true, blog: true }, maintenance: { enabled: false, title: "We'll be back soon", description: "We're preparing something special for you. Please check back shortly.", buttonText: "Back to Home" } };

export default function PageAvailabilityGate({ page, children }: { page: string; children: React.ReactNode }) {
  const [state, setState] = useState<any>(null);
  useEffect(() => { getSiteSettings().then((s) => setState({ ...defaults, ...(s.siteControl || {}), pages: { ...defaults.pages, ...(s.siteControl?.pages || {}) }, maintenance: { ...defaults.maintenance, ...(s.siteControl?.maintenance || {}) } })).catch(() => setState(defaults)); }, []);
  if (!state) return <main className="grid min-h-screen place-items-center bg-wedding-cream text-sm text-muted-foreground">Loading…</main>;
  if (state.maintenance?.enabled) return <MaintenanceScreen state={state.maintenance} />;
  const enabled = state.mode === "disabled" ? false : state.mode === "landing" ? false : state.pages?.[page] !== false;
  if (!enabled) return <DisabledPage />;
  return <>{children}</>;
}

function MaintenanceScreen({ state }: { state: any }) {
  return <main className="grid min-h-screen place-items-center bg-wedding-cream p-6 text-center"><div className="max-w-xl rounded-3xl border border-primary/10 bg-white/80 p-10 shadow-sm"><Settings className="mx-auto text-primary" size={34}/><h1 className="mt-5 font-display text-4xl">{state.title}</h1><p className="mt-4 text-muted-foreground">{state.description}</p><Link to="/" className="mt-7 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">{state.buttonText}</Link></div></main>;
}
function DisabledPage() { return <main className="grid min-h-screen place-items-center bg-wedding-cream p-6 text-center"><div className="max-w-md rounded-3xl border border-primary/10 bg-white/80 p-10 shadow-sm"><h1 className="font-display text-4xl">Coming Soon</h1><p className="mt-3 text-sm text-muted-foreground">This page is temporarily unavailable.</p><Link to="/" className="mt-6 inline-flex rounded-full border px-5 py-2.5 text-sm text-primary">Back to Home</Link></div></main>; }
