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

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();

      // Best effort on mobile browsers that support screen orientation locking.
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: "landscape") => Promise<void>;
      };
      if (typeof orientation.lock === "function" && window.matchMedia("(max-width: 767px)").matches) {
        try {
          await orientation.lock("landscape");
        } catch {
          // Orientation locking is optional and browser-dependent.
        }
      }
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
