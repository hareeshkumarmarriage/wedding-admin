import { useState, useEffect } from "react";
import { Bell, Heart, X } from "lucide-react";
import { getHomepageSections, getSiteSettings, getPublicNotifications, type HomepageSectionRecord } from "@/lib/supabaseData";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/wedding/Navbar";
import HeroSection from "@/components/wedding/HeroSection";
import CoupleSection from "@/components/wedding/CoupleSection";
import StorySection from "@/components/wedding/StorySection";
import GallerySection from "@/components/wedding/GallerySection";
import EventsSection from "@/components/wedding/EventsSection";
import BlogSection from "@/components/wedding/BlogSection";
import FooterSection from "@/components/wedding/FooterSection";
import GuestbookSection from "@/components/wedding/GuestbookSection";
import IntroVideoOverlay from "@/components/wedding/IntroVideoOverlayV2";
import RsvpSection from "@/components/wedding/RsvpSection";
import ShareWedding from "@/components/wedding/ShareWedding";

type SiteControl = { mode?: "all" | "landing" | "disabled"; pages?: Record<string, boolean>; maintenance?: { enabled?: boolean; title?: string; description?: string } };
type WeddingSettings = { introEnabled?: boolean; groomName?: string; brideName?: string; introVideoDriveId?: string; introAutoplay?: boolean; introMuted?: boolean; introSkip?: boolean; introMobilePortrait?: boolean; introVideoPlayMode?: "once" | "always"; [key: string]: unknown };
type ThemeSettings = { darkMode?: boolean; primary?: string; headingFont?: string; bodyFont?: string };

const Index = () => {
  const [showIntro, setShowIntro] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [sections, setSections] = useState<HomepageSectionRecord[]>([]);
  const [siteControl, setSiteControl] = useState<SiteControl>({ mode: "all", maintenance: { enabled: false }, pages: {} });
  const [wedding, setWedding] = useState<WeddingSettings>({});
  const [visitorName, setVisitorName] = useState("");
  const [visitorPrompt, setVisitorPrompt] = useState(false);
  const [visitorBlocked, setVisitorBlocked] = useState(false);
  const [publicNotifications, setPublicNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(true);

  useEffect(() => {
    getHomepageSections().then(setSections).catch(() => {});
    getSiteSettings().then((rawSettings) => {
      const useDraft = new URLSearchParams(window.location.search).get("preview") === "draft";
      let localDraft: any = null;
      if (useDraft) { try { const raw = localStorage.getItem("wedding-admin-preview-draft"); localDraft = raw ? JSON.parse(raw) : null; } catch {} }
      const draft = useDraft && (localDraft?.wedding || rawSettings.siteDraft?.wedding) ? (localDraft || rawSettings.siteDraft) : null;
      const settings = draft ? { ...rawSettings, wedding: draft.wedding || rawSettings.wedding, theme: draft.theme || rawSettings.theme, siteControl: draft.siteControl || rawSettings.siteControl } : rawSettings;
      const nextWedding = settings.wedding as WeddingSettings | undefined;
      const nextControl = settings.siteControl as SiteControl | undefined;
      const theme = settings.theme as ThemeSettings | undefined;
      setWedding(nextWedding || {});
      setSiteControl({ mode: nextControl?.mode || "all", pages: nextControl?.pages || {}, maintenance: nextControl?.maintenance || { enabled: false } });
      document.documentElement.classList.toggle("dark", !!theme?.darkMode);
      document.documentElement.dataset.theme = theme?.primary || "rose";
      document.documentElement.dataset.headingFont = theme?.headingFont || "Playfair Display";
      document.documentElement.dataset.bodyFont = theme?.bodyFont || "Josefin Sans";
      if (nextWedding?.groomName || nextWedding?.brideName) document.title = `${nextWedding?.groomName || "Hareesh"} & ${nextWedding?.brideName || "Prasanna"} | Wedding`;
      setSettingsReady(true);
    }).catch(() => setSettingsReady(true));
  }, []);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    if (!requested || !sections.length) return;
    let attempts = 0;
    const focus = () => {
      attempts += 1;
      const element = document.getElementById(requested);
      if (element) { element.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (attempts < 10) window.setTimeout(focus, 100);
    };
    const timer = window.setTimeout(focus, 150);
    return () => window.clearTimeout(timer);
  }, [sections]);

  useEffect(() => {
    if (!settingsReady || wedding.introEnabled === false) return;
    let active = true;
    const readyKey = "wedding-loading-screen-ready-path-v1";
    const currentPath = window.location.pathname;
    const introShownKey = `wedding-intro-overlay-shown-v1:${currentPath}`;
    const playEveryVisit = wedding.introVideoPlayMode === "always";
    const show = () => {
      if (!active) return;
      if (!playEveryVisit) {
        try { if (sessionStorage.getItem(introShownKey) === "1") return; sessionStorage.setItem(introShownKey, "1"); } catch {}
      }
      setShowIntro(true);
    };
    let ready = false;
    try { ready = sessionStorage.getItem(readyKey) === currentPath; } catch {}
    if (ready) { show(); return () => { active = false; }; }
    window.addEventListener("wedding-loading-finished", show);
    return () => { active = false; window.removeEventListener("wedding-loading-finished", show); };
  }, [settingsReady, wedding.introEnabled, wedding.introVideoPlayMode]);

  useEffect(() => {
    if (showIntro) return;
    const timer = window.setTimeout(() => {
      const key = "wedding-public-viewer-device-id-v1";
      const namedKey = "wedding-public-viewer-name-v1";
      let deviceId = localStorage.getItem(key);
      if (!deviceId) { deviceId = `${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}`; localStorage.setItem(key, deviceId); }
      const saved = localStorage.getItem(namedKey);
      if (saved) { fetch("/api/visitor-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_id: deviceId, visitor_name: saved }) }).then(r => r.json()).then(d => setVisitorBlocked(Boolean(d.blocked))).catch(() => {}); return; }
      setVisitorPrompt(true);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [showIntro]);

  useEffect(() => {
    if (showIntro) return;
    const deviceId = localStorage.getItem("wedding-public-viewer-device-id-v1");
    const visitorName = localStorage.getItem("wedding-public-viewer-name-v1");
    if (!deviceId || !visitorName) return;
    const heartbeat = () => fetch("/api/visitor-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_id: deviceId, visitor_name: visitorName }) }).then(r => r.json()).then(d => setVisitorBlocked(Boolean(d.blocked))).catch(() => {});
    const timer = window.setInterval(heartbeat, 60000);
    return () => window.clearInterval(timer);
  }, [showIntro]);

  useEffect(() => { getPublicNotifications(10).then(setPublicNotifications).catch(() => {}); }, []);

  const submitVisitorName = async () => {
    const name = visitorName.trim(); if (!name) return;
    const deviceId = localStorage.getItem("wedding-public-viewer-device-id-v1") || "";
    try {
      const r = await fetch("/api/visitor-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_id: deviceId, visitor_name: name }) });
      const d = await r.json().catch(() => ({}));
      setVisitorBlocked(Boolean(d.blocked)); if (d.blocked) return;
      if (!r.ok || !d.ok) throw new Error(d.error || "Unable to save your name.");
      localStorage.setItem("wedding-public-viewer-name-v1", name); setVisitorPrompt(false);
    } catch {}
  };

  if (siteControl.maintenance?.enabled === true || siteControl.mode === "disabled") return <main className="grid min-h-screen place-items-center bg-wedding-cream p-6 text-center"><div className="max-w-xl rounded-3xl border border-primary/10 bg-white/80 p-10 shadow-sm"><Heart className="mx-auto text-primary" fill="currentColor" size={34}/><h1 className="mt-5 font-display text-4xl">{siteControl.maintenance?.title || "We'll be back soon"}</h1><p className="mt-4 text-muted-foreground">{siteControl.maintenance?.description || "We're preparing something special for you. Please check back shortly."}</p></div></main>;

  return <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="overflow-x-hidden">
      <Navbar />
      {(sections.length ? sections : [
        { key: "hero", enabled: true, sort_order: 1, label: "Hero" }, { key: "couple", enabled: true, sort_order: 2, label: "Couple" }, { key: "story", enabled: true, sort_order: 3, label: "Story & Memories" }, { key: "gallery", enabled: true, sort_order: 4, label: "Gallery" }, { key: "events", enabled: true, sort_order: 5, label: "Wedding & Venue" }, { key: "rsvp", enabled: true, sort_order: 6, label: "RSVP" }, { key: "guestbook", enabled: true, sort_order: 7, label: "Guestbook" }, { key: "blog", enabled: false, sort_order: 8, label: "Blog" }, { key: "footer", enabled: true, sort_order: 9, label: "Footer" },
      ]).filter((s) => s.enabled && (siteControl.mode !== "landing" || ["hero", "events", "footer"].includes(s.key))).map((section) => {
        switch (section.key) {
          case "hero": return <div key={section.key} id="home"><HeroSection settings={wedding} /></div>;
          case "couple": return <div key={section.key} id="couple"><CoupleSection /></div>;
          case "story": return <div key={section.key} id="story"><StorySection /></div>;
          case "gallery": return <div key={section.key} id="gallery"><GallerySection /></div>;
          case "events": return <div key={section.key} id="events"><EventsSection /></div>;
          case "rsvp": return <div key={section.key} id="rsvp"><RsvpSection /></div>;
          case "guestbook": return <div key={section.key} id="guestbook"><GuestbookSection /></div>;
          case "blog": return <div key={section.key} id="blog"><BlogSection /></div>;
          case "footer": return <div key={section.key} id="footer"><FooterSection /></div>;
          default: return null;
        }
      })}
      <ShareWedding />
      {publicNotifications.length > 0 && showNotifications && <div className="fixed bottom-4 left-4 right-4 z-[1000] mx-auto max-w-2xl rounded-3xl border border-primary/15 bg-white/95 p-4 shadow-2xl backdrop-blur"><div className="flex items-start gap-3"><Bell className="mt-1 shrink-0 text-primary" size={18}/><div className="min-w-0 flex-1"><p className="font-display text-lg">Latest updates</p>{publicNotifications.slice(0, 3).map(n => <div key={n.id} className="mt-2 border-t border-primary/10 pt-2"><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.message}</p></div>)}</div><button type="button" onClick={() => setShowNotifications(false)} aria-label="Close notifications"><X size={16}/></button></div></div>}
    </motion.div>
    {!showIntro && visitorPrompt && <div className="fixed inset-0 z-[12000] grid place-items-center bg-black/55 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-7 shadow-2xl"><p className="text-center text-xs uppercase tracking-[0.25em] text-primary">Welcome</p><h2 className="mt-2 text-center font-display text-3xl">May we know your name?</h2><p className="mt-2 text-center text-sm text-muted-foreground">This is asked only once on this device to personalize your visitor session.</p>{visitorBlocked ? <div className="mt-5 rounded-2xl bg-red-50 p-4 text-center text-sm text-red-700"><p className="font-medium">Access blocked</p><p className="mt-1">This device has been blocked by the administrator. If access was restored, refresh this page and your current visitor session will be checked again.</p></div> : <><input autoFocus value={visitorName} onChange={e => setVisitorName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submitVisitorName(); }} maxLength={80} placeholder="Your name" className="mt-5 h-12 w-full rounded-2xl border px-4"/><button type="button" onClick={() => void submitVisitorName()} className="mt-4 h-12 w-full rounded-full bg-primary text-sm text-primary-foreground">Continue</button></>}</div></div>}
    <AnimatePresence mode="wait">{showIntro && wedding.introEnabled !== false && <IntroVideoOverlay settings={wedding} onFinished={() => setShowIntro(false)} />}</AnimatePresence>
  </>;
};

export default Index;
