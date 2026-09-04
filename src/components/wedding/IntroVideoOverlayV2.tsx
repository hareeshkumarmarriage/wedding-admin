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

export default function IntroVideoOverlayV2({
  onFinished,
  settings: suppliedSettings,
}: {
  onFinished: () => void;
  settings?: WeddingSettings;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [settingsReady, setSettingsReady] = useState(Boolean(suppliedSettings));
  const [settings, setSettings] = useState<WeddingSettings | undefined>(suppliedSettings);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [error, setError] = useState(false);
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
  const portrait = settings?.introMobilePortrait === true;
  const playMode = settings?.introVideoPlayMode === "always" ? "always" : "once";

  const shouldPlay = useMemo(() => {
    if (playMode === "always") return true;
    try {
      // Keep compatibility with the previously working intro state while also
      // recognizing the newer key used by the updated overlay.
      return localStorage.getItem("wedding-intro-video-played-v3") !== "1" && localStorage.getItem("wedding-intro-video-played-v4") !== "1";
    } catch {
      return true;
    }
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
    setError(!previewSource);
  }, [settingsReady, shouldPlay, previewSource]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => setShowSkip(true), 700);
    return () => {
      document.body.style.overflow = previous;
      clearTimeout(timer);
    };
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

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
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
          className="absolute inset-0 h-full w-full object-cover opacity-0"
        />

        {previewSource && !error ? (
          <iframe
            key={previewSource}
            title="Wedding introduction video"
            src={previewSource}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onError={() => setError(true)}
            className={`absolute inset-0 z-10 h-full w-full border-0 bg-black ${portrait ? "intro-video-mobile-portrait" : ""}`}
          />
        ) : (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black p-6 text-center text-white">
            <div>
              <p className="font-display text-2xl">Welcome, Hareesh &amp; Prasanna</p>
              <p className="mt-2 text-sm text-white/70">The intro video could not be loaded.</p>
              <button
                type="button"
                onClick={finish}
                className="mt-5 rounded-full border border-white/40 px-5 py-2.5"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
      </div>

      <div className="absolute right-4 top-4 z-30 flex gap-2">
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
        {showSkip && (
          <motion.button
            type="button"
            onClick={finish}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-6 right-5 z-30 rounded-full border border-white/50 bg-black/35 px-5 py-2.5 text-sm text-white backdrop-blur-md"
          >
            Skip Intro
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
