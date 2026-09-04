import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize, Minimize } from "lucide-react";
import heroImage from "@/assets/hero-couple.jpg";
import { getSiteSettings } from "@/lib/supabaseData";

const DEFAULT_INTRO_VIDEO_FILE_ID = "1ANoJPcBbypy3IRRVx8WMxGo5uEXMd6nW";

type WeddingSettings = {
  introVideoDriveId?: string;
  introAutoplay?: boolean;
  introMobilePortrait?: boolean;
  introVideoPlayMode?: "once" | "always";
};

export default function IntroVideoOverlayV2({ onFinished }: { onFinished: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [settingsReady, setSettingsReady] = useState(false);
  const [videoId, setVideoId] = useState(DEFAULT_INTRO_VIDEO_FILE_ID);
  const [autoplay, setAutoplay] = useState(true);
  const [portrait, setPortrait] = useState(false);
  const [playMode, setPlayMode] = useState<"once" | "always">("once");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    let active = true;
    getSiteSettings().then((settings) => {
      if (!active) return;
      const wedding = settings.wedding as WeddingSettings | undefined;
      setVideoId(String(wedding?.introVideoDriveId || "").trim() || DEFAULT_INTRO_VIDEO_FILE_ID);
      setAutoplay(wedding?.introAutoplay !== false);
      setPortrait(wedding?.introMobilePortrait === true);
      setPlayMode(wedding?.introVideoPlayMode === "always" ? "always" : "once");
      setSettingsReady(true);
    }).catch(() => setSettingsReady(true));
    return () => { active = false; };
  }, []);

  const shouldPlay = useMemo(() => {
    if (playMode === "always") return true;
    try { return localStorage.getItem("wedding-intro-video-played-v3") !== "1"; } catch { return true; }
  }, [playMode]);

  const previewSource = useMemo(() => {
    if (!videoId) return "";
    const params = new URLSearchParams({ autoplay: autoplay ? "1" : "0" });
    return `https://drive.google.com/file/d/${encodeURIComponent(videoId)}/preview?${params.toString()}`;
  }, [videoId, autoplay]);

  useEffect(() => {
    if (!settingsReady || !shouldPlay) {
      if (settingsReady && !shouldPlay) finish();
      return;
    }
    setLoaded(false);
    setError(!previewSource);
    const timer = window.setTimeout(() => {
      if (!loaded) setError(true);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [settingsReady, shouldPlay, previewSource, loaded]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => setShowSkip(true), 700);
    return () => { document.body.style.overflow = previous; clearTimeout(timer); };
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    if (shouldPlay) {
      try { localStorage.setItem("wedding-intro-video-played-v3", "1"); } catch {}
    }
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    onFinished();
  };

  const toggleFullscreen = async () => {
    const el = overlayRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreen(false);
      } else {
        await el.requestFullscreen();
        setFullscreen(true);
      }
    } catch {}
  };

  if (!settingsReady || !shouldPlay) return null;

  return (
    <motion.div ref={overlayRef} className="fixed inset-0 z-[11000] overflow-hidden bg-black" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Wedding introduction" aria-modal="true">
      <div className="absolute inset-0 bg-black">
        <img src={heroImage} alt="" aria-hidden="true" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`} />
        {previewSource && !error && (
          <iframe
            key={previewSource}
            title="Wedding introduction video"
            src={previewSource}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${portrait ? "intro-video-mobile-portrait" : ""}`}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" />
      </div>
      <div className="absolute right-4 top-4 z-30 flex gap-2">
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-md">
          {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
        </button>
      </div>
      <AnimatePresence>
        {showSkip && (
          <motion.button type="button" onClick={finish} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="absolute bottom-6 right-5 z-30 rounded-full border border-white/50 bg-black/35 px-5 py-2.5 text-sm text-white backdrop-blur-md">
            Skip Intro
          </motion.button>
        )}
      </AnimatePresence>
      {error && (
        <div className="absolute inset-0 z-20 grid place-items-center p-6 text-center text-white">
          <div>
            <p className="font-display text-2xl">Welcome, Hareesh &amp; Prasanna</p>
            <p className="mt-2 text-sm text-white/70">The intro video could not be loaded.</p>
            <button type="button" onClick={finish} className="mt-5 rounded-full border border-white/40 px-5 py-2.5">Continue</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
