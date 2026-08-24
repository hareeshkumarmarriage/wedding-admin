import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";

export default function GlobalFullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const lockPortraitIfPossible = async () => {
    try {
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches) {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
        if (orientation?.lock) await orientation.lock("portrait");
      }
    } catch {
      // Some mobile browsers do not allow orientation locking. Fullscreen still works.
    }
  };

  const unlockOrientationIfPossible = () => {
    try { screen.orientation?.unlock?.(); } catch {}
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        unlockOrientationIfPossible();
        return;
      }

      await document.documentElement.requestFullscreen();
      // Keep the wedding site fullscreen in portrait on mobile; never request landscape.
      await lockPortraitIfPossible();
    } catch {
      // Fullscreen can be unavailable in some embedded browsers.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggleFullscreen()}
      aria-label={isFullscreen ? "Exit fullscreen" : "View website in fullscreen"}
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      className="fixed bottom-5 right-5 z-[10000] flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-white/85 text-foreground shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 sm:bottom-7 sm:right-7"
    >
      {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
    </button>
  );
}
