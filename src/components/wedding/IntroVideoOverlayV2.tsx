import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize, Minimize, Play, Volume2, VolumeX } from "lucide-react";
import heroImage from "@/assets/hero-couple.jpg";
import { getSiteSettings } from "@/lib/supabaseData";

const DEFAULT_INTRO_VIDEO_FILE_ID = "1ANoJPcBbypy3IRRVx8WMxGo5uEXMd6nW";

type WeddingSettings = {
  introEnabled?: boolean;
  introVideoDriveId?: string;
  introAutoplay?: boolean;
  introMuted?: boolean;
  introSkip?: boolean;
  introMobilePortrait?: boolean;
  introVideoPlayMode?: "once" | "always";
};

export default function IntroVideoOverlayV2({
  onFinished,
  settings: suppliedSettings,
}: {
  onFinished: () => void;
  settings?: WeddingSettings;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [settingsReady, setSettingsReady] = useState(Boolean(suppliedSettings));
  const [settings, setSettings] = useState<WeddingSettings | undefined>(suppliedSettings);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [muted, setMuted] = useState(true);
  const finished = useRef(false);

  useEffect(() => {
    if (suppliedSettings) {
      setSettings(suppliedSettings);
      setSettingsReady(true);
      return;
    }

    let active = true;
    getSiteSettings()
      .then((raw) => {
        if (!active) return;
        setSettings((raw.wedding || {}) as WeddingSettings);
        setSettingsReady(true);
      })
      .catch(() => setSettingsReady(true));

    return () => {
      active = false;
    };
  }, [suppliedSettings]);

  const videoId = String(settings?.introVideoDriveId || "").trim() || DEFAULT_INTRO_VIDEO_FILE_ID;
  const autoplay = settings?.introAutoplay !== false;
  const configuredMuted = settings?.introMuted !== false;
  const skipEnabled = settings?.introSkip !== false;
  const portrait = settings?.introMobilePortrait === true;
  const playMode = settings?.introVideoPlayMode === "always" ? "always" : "once";

  const shouldPlay = useMemo(() => {
    if (playMode === "always") return true;
    try {
      return localStorage.getItem("wedding-intro-video-played-v4") !== "1" && localStorage.getItem("wedding-intro-video-played-v3") !== "1";
    } catch {
      return true;
    }
  }, [playMode]);

  const videoSource = useMemo(() => {
    if (!videoId) return "";
    return `/api/media?id=${encodeURIComponent(videoId)}`;
  }, [videoId]);

  useEffect(() => {
    if (!settingsReady || !shouldPlay) {
      if (settingsReady && !shouldPlay) finish();
      return;
    }
    setMuted(configuredMuted);
    setVideoReady(false);
    setPlaying(false);
    setError(!videoSource);
  }, [settingsReady, shouldPlay, videoSource, configuredMuted]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (skipEnabled) setShowSkip(true);
    return () => {
      document.body.style.overflow = previous;
    };
  }, [skipEnabled]);

  useEffect(() => {
    const handleFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;

    if (shouldPlay) {
      try {
        localStorage.setItem("wedding-intro-video-played-v3", "1");
        localStorage.setItem("wedding-intro-video-played-v4", "1");
      } catch {}
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    onFinished();
  };

  const startVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
    } catch {
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
    if (!next && video.paused) void startVideo();
  };

  const toggleFullscreen = async () => {
    const el = overlayRef.current;
    if (!el) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {}
  };

  const handleVideoReady = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = configuredMuted;
    setMuted(video.muted);
    setVideoReady(true);
    setError(false);

    if (autoplay) void startVideo();
  };

  if (!settingsReady || !shouldPlay) return null;

  return (
    <motion.div
      ref={overlayRef}
      className="fixed inset-0 z-[11000] overflow-hidden bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Wedding introduction"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${videoReady && !error ? "opacity-0" : "opacity-100"}`}
        />

        {videoSource && !error ? (
          <video
            ref={videoRef}
            key={videoSource}
            src={videoSource}
            className={`absolute inset-0 z-10 h-full w-full bg-black object-cover ${portrait ? "intro-video-mobile-portrait" : ""}`}
            autoPlay={autoplay}
            muted={configuredMuted}
            playsInline
            preload="auto"
            onLoadedData={handleVideoReady}
            onCanPlay={handleVideoReady}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={finish}
            onError={() => {
              setVideoReady(false);
              setError(true);
            }}
            aria-label="Wedding introduction video"
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/10 via-transparent to-black/45" />
      </div>

      {error && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/90 p-6 text-center text-white">
          <div>
            <p className="font-display text-2xl">Welcome, Hareesh &amp; Prasanna</p>
            <p className="mt-2 text-sm text-white/70">The intro video could not be loaded.</p>
            <button type="button" onClick={finish} className="mt-5 rounded-full border border-white/40 px-5 py-2.5">Continue</button>
          </div>
        </div>
      )}

      <div className="absolute right-4 top-4 z-40 flex gap-2">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute intro" : "Mute intro"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-md"
        >
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-md"
        >
          {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
        </button>
      </div>

      <AnimatePresence>
        {!error && !playing && videoReady && (
          <motion.button
            type="button"
            onClick={() => void startVideo()}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            aria-label="Play intro"
            className="absolute left-1/2 top-1/2 z-40 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-black/35 text-white backdrop-blur-md"
          >
            <Play size={24} fill="currentColor" className="ml-1" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {skipEnabled && showSkip && !error && (
          <motion.button
            type="button"
            onClick={finish}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-6 right-5 z-40 rounded-full border border-white/50 bg-black/35 px-5 py-2.5 text-sm text-white backdrop-blur-md"
          >
            Skip Intro
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
