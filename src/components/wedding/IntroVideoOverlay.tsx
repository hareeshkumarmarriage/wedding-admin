import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import heroImage from "@/assets/hero-couple.jpg";
import { getSiteSettings } from "@/lib/supabaseData";
import { driveFileIdFallbackUrls } from "@/lib/homepageMedia";

const DEFAULT_INTRO_VIDEO_FILE_ID = "1ANoJPcBbypy3IRRVx8WMxGo5uEXMd6nW";

interface IntroVideoOverlayProps { onFinished: () => void; }

export default function IntroVideoOverlay({ onFinished }: IntroVideoOverlayProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [muted, setMuted] = useState(true);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [videoId, setVideoId] = useState(DEFAULT_INTRO_VIDEO_FILE_ID);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [mobilePortrait, setMobilePortrait] = useState(false);
  const [videoPlayMode, setVideoPlayMode] = useState<"once" | "always">("once");
  const [introSettingsReady, setIntroSettingsReady] = useState(false);
  const [showOpening, setShowOpening] = useState(true);
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);

  useEffect(() => {
    getSiteSettings().then((settings) => {
      const id = String(settings.wedding?.introVideoDriveId || "").trim();
      setVideoId(id || DEFAULT_INTRO_VIDEO_FILE_ID);
      setAutoplayEnabled(settings.wedding?.introAutoplay !== false);
      setMuted(settings.wedding?.introMuted !== false);
      setMobilePortrait(settings.wedding?.introMobilePortrait === true);
      setVideoPlayMode(settings.wedding?.introVideoPlayMode === "always" ? "always" : "once");
      setSourceIndex(0);
      setVideoError(false);
      setVideoReady(false);
      setIntroSettingsReady(true);
    }).catch(() => { setVideoId(DEFAULT_INTRO_VIDEO_FILE_ID); setSourceIndex(0); setVideoPlayMode("once"); setIntroSettingsReady(true); });
  }, []);

  useEffect(() => {
    if (!introSettingsReady) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      const playedKey = "wedding-intro-video-played-v3";
      const alreadyPlayed = window.localStorage.getItem(playedKey) === "1";
      const playVideo = videoPlayMode === "always" || !alreadyPlayed;
      setShouldPlayVideo(playVideo);
      setShowOpening(false);
      if (!playVideo) onFinished();
    }, 1500);
    return () => { active = false; window.clearTimeout(timer); };
  }, [introSettingsReady, videoPlayMode, onFinished]);

  const sources = useMemo(() => driveFileIdFallbackUrls(videoId, "download"), [videoId]);
  const source = sources[sourceIndex] || "";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => setShowSkip(true), 700);
    return () => { document.body.style.overflow = previousOverflow; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    setSourceIndex(0);
    setVideoError(false);
    setVideoReady(false);
  }, [videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source || !autoplayEnabled || !shouldPlayVideo || showOpening) return;
    video.muted = muted;
    video.volume = muted ? 0 : 1;
    void video.play().catch(() => undefined);
  }, [source, autoplayEnabled, muted, shouldPlayVideo, showOpening]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === overlayRef.current;
      setIsFullscreen(active);
      if (active) void lockPortraitIfPossible();
      else unlockOrientationIfPossible();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    video.volume = nextMuted ? 0 : 1;
    setMuted(nextMuted);
    if (video.paused) void video.play().catch(() => undefined);
  };

  const lockPortraitIfPossible = async () => {
    try {
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches) {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
        if (orientation?.lock) await orientation.lock("portrait");
      }
    } catch {
      // Orientation locking is optional and is not supported by every mobile browser.
    }
  };

  const unlockOrientationIfPossible = () => {
    try { screen.orientation?.unlock?.(); } catch {}
  };

  const toggleFullscreen = async () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        unlockOrientationIfPossible();
        return;
      }
      await overlay.requestFullscreen();
      // Portrait locking applies only while the intro overlay itself is fullscreen.
      await lockPortraitIfPossible();
    } catch {}
  };

  const finish = async () => {
    if (shouldPlayVideo) window.localStorage.setItem("wedding-intro-video-played-v3", "1");
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
    unlockOrientationIfPossible();
    onFinished();
  };

  return <motion.div ref={overlayRef} className="fixed inset-0 z-[11000] overflow-hidden bg-black" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} role="dialog" aria-label="Wedding introduction" aria-modal="true">
    <div className="absolute inset-0 bg-black">
      <img src={heroImage} alt="" aria-hidden="true" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-0" : "opacity-100"}`} />
      {shouldPlayVideo && source && !videoError ? <video key={source} ref={videoRef} autoPlay={autoplayEnabled && !showOpening} muted={muted} playsInline preload="auto" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"} ${mobilePortrait ? "intro-video-mobile-portrait" : ""}`} src={source} onLoadedData={() => setVideoReady(true)} onCanPlay={() => setVideoReady(true)} onError={() => { if (sourceIndex + 1 < sources.length) { setSourceIndex((i) => i + 1); setVideoReady(false); } else setVideoError(true); }} onEnded={() => void finish()} /> : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55" />
      <AnimatePresence>
        {showOpening && <motion.div key="intro-opening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .45 }} className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <motion.div initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .8 }} className="font-display text-6xl md:text-8xl tracking-wider">H <span className="text-primary">♥</span> P</motion.div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35, duration: .55 }} className="mt-4 text-xs uppercase tracking-[.35em] text-white/70">Hareesh &amp; Prasanna</motion.p>
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>
    <div className="absolute left-4 right-4 top-4 z-30 flex items-center justify-end gap-2 sm:left-6 sm:right-6 sm:top-6">
      <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute intro video" : "Mute intro video"} title={muted ? "Unmute" : "Mute"} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white/70">{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
      <button type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white/70">{isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}</button>
    </div>
    <AnimatePresence>{showSkip && <motion.button type="button" onClick={() => void finish()} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="absolute bottom-6 right-5 z-20 rounded-full border border-white/50 bg-black/35 px-5 py-2.5 text-sm text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white/70 md:bottom-8 md:right-8">Skip Intro</motion.button>}</AnimatePresence>
    {videoError && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white"><div className="max-w-md"><p className="font-display text-2xl">Welcome, Hareesh &amp; Prasanna</p><p className="mt-2 text-sm text-white/70">The intro video could not be loaded. You can continue to the wedding page.</p><button type="button" onClick={() => void finish()} className="mt-5 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm text-white backdrop-blur">Continue</button></div></div>}
  </motion.div>;
}
