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
      className="wedding-fullscreen-control"
      style={{
        position: "fixed",
        top: "auto",
        right: "16px",
        bottom: "16px",
        left: "auto",
        width: "40px",
        minWidth: "40px",
        maxWidth: "40px",
        height: "40px",
        minHeight: "40px",
        maxHeight: "40px",
        padding: 0,
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        zIndex: 10000,
        boxSizing: "border-box",
      }}
    >
      {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
    </button>
  );
}
