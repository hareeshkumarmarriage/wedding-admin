import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { getHomepageSections, type HomepageSectionRecord } from "@/lib/supabaseData";
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
import IntroVideoOverlay from "@/components/wedding/IntroVideoOverlay";
import RsvpSection from "@/components/wedding/RsvpSection";
import ShareWedding from "@/components/wedding/ShareWedding";

const Index = () => {
  const [endLoad, setEndLoad] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [sections, setSections] = useState<HomepageSectionRecord[]>([]);
  const [siteControl, setSiteControl] = useState<any>({ mode: "all", maintenance: { enabled: false }, pages: {} });
  const [wedding, setWedding] = useState<any>({});

  useEffect(() => {
    getHomepageSections().then(setSections).catch(() => {});
    import("@/lib/supabaseData").then(({ getSiteSettings }) => getSiteSettings()).then((rawSettings) => {
      const useDraft = new URLSearchParams(window.location.search).get("preview") === "draft";
      const draft = useDraft && rawSettings.siteDraft?.wedding ? rawSettings.siteDraft : null;
      const settings = draft ? { ...rawSettings, wedding: draft.wedding || rawSettings.wedding, theme: draft.theme || rawSettings.theme, siteControl: draft.siteControl || rawSettings.siteControl } : rawSettings;
      setWedding(settings.wedding || {});
      setSiteControl({ mode: settings.siteControl?.mode || "all", pages: settings.siteControl?.pages || {}, maintenance: settings.siteControl?.maintenance || { enabled: false } });
      const theme = settings.theme || {};
      document.documentElement.classList.toggle("dark", !!theme.darkMode);
      document.documentElement.dataset.theme = theme.primary || "rose";
      document.documentElement.dataset.headingFont = theme.headingFont || "Playfair Display";
      document.documentElement.dataset.bodyFont = theme.bodyFont || "Josefin Sans";
      if (settings.wedding?.groomName || settings.wedding?.brideName) document.title = `${settings.wedding?.groomName || "Hareesh"} & ${settings.wedding?.brideName || "Prasanna"} | Wedding`;
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { setEndLoad(true); setShowIntro(true); }, Math.max(500, Number(wedding.loadingDuration || 1200)));
    return () => window.clearTimeout(timer);
  }, [wedding.loadingDuration]);

  if (siteControl.maintenance?.enabled || siteControl.mode === "disabled") return <main className="grid min-h-screen place-items-center bg-wedding-cream p-6 text-center"><div className="max-w-xl rounded-3xl border border-primary/10 bg-white/80 p-10 shadow-sm"><Heart className="mx-auto text-primary" fill="currentColor" size={34}/><h1 className="mt-5 font-display text-4xl">{siteControl.maintenance.title || "We'll be back soon"}</h1><p className="mt-4 text-muted-foreground">{siteControl.maintenance.description || "We're preparing something special for you. Please check back shortly."}</p></div></main>;

  return (
    <>
      <AnimatePresence>
        {!endLoad && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-wedding-cream"
          >
            <div className={`loading-screen-content flex items-center gap-5 px-5 text-black ${wedding.loadingLayout === "horizontal" ? "flex-row" : "flex-col"}`}>
              <p className="font-display text-center leading-tight" style={{fontSize:`${Number(wedding.loadingTextSize||30)}px`}}>{wedding.loadingText || `${wedding.groomName || "Hareesh"} & ${wedding.brideName || "Prasanna"}`}</p>
              {wedding.loadingHeartEnabled !== false && (
                <motion.div animate={{ scale: [1, 1.18, 1], opacity: [0.45, 1, 0.45] }} transition={{ repeat: Infinity, duration: 1.15, ease: "easeInOut" }} aria-label="Loading">
                  <Heart className="h-16 w-16 shrink-0 text-primary fill-primary/60" />
                </motion.div>
              )}
              <p className="font-display text-center leading-tight" style={{fontSize:`${Number(wedding.loadingText2Size||24)}px`}}>{wedding.loadingText2 || "Made with love"}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - only shows once loading is done */}
      {endLoad && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="overflow-x-hidden"
        >
          <Navbar />
          {(sections.length ? sections : [
            { key: "hero", enabled: true, sort_order: 1, label: "Hero" },
            { key: "couple", enabled: true, sort_order: 2, label: "Couple" },
            { key: "story", enabled: true, sort_order: 3, label: "Story & Memories" },
            { key: "gallery", enabled: true, sort_order: 4, label: "Gallery" },
            { key: "events", enabled: true, sort_order: 5, label: "Wedding & Venue" },
            { key: "rsvp", enabled: true, sort_order: 6, label: "RSVP" },
            { key: "guestbook", enabled: true, sort_order: 7, label: "Guestbook" },
            { key: "blog", enabled: false, sort_order: 8, label: "Blog" },
            { key: "footer", enabled: true, sort_order: 9, label: "Footer" },
          ]).filter((s) => s.enabled).map((section) => {
            switch (section.key) {
              case "hero": return <div key={section.key} id="home"><HeroSection /></div>;
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
        </motion.div>
      )}

      <AnimatePresence>
        {endLoad && showIntro && wedding.introEnabled !== false && (
          <IntroVideoOverlay onFinished={() => setShowIntro(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default Index;