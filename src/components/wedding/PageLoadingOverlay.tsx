import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getSiteSettings } from "@/lib/supabaseData";

const DEFAULT_DURATION = 1200;
const LOADER_PLAYED_KEY = "wedding-loading-screen-played-v1";
const LOADER_READY_KEY = "wedding-loading-screen-ready-path-v1";
let loaderCompletionPath: string | null = null;

const markReady = (pathname: string) => {
  if (loaderCompletionPath === pathname) return;
  loaderCompletionPath = pathname;
  try {
    sessionStorage.setItem(LOADER_READY_KEY, pathname);
  } catch {}
  window.dispatchEvent(new CustomEvent("wedding-loading-finished", { detail: { pathname } }));
};

export default function PageLoadingOverlay() {
  const location = useLocation();
  const [wedding, setWedding] = useState<any>({});
  const [settingsReady, setSettingsReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((settings) => {
        if (!active) return;
        setWedding(settings.wedding || {});
        setSettingsReady(true);
      })
      .catch(() => {
        if (!active) return;
        setWedding({});
        setSettingsReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;

    const isHome = location.pathname === "/";
    const eligible = isHome || wedding.loadingAllPages === true;
    const playMode = wedding.loadingPlayMode === "always" ? "always" : "once";

    if (!eligible) {
      setVisible(false);
      loaderCompletionPath = null;
      return;
    }

    let alreadyPlayed = false;
    try { alreadyPlayed = localStorage.getItem(LOADER_PLAYED_KEY) === "1"; } catch {}

    // "Once" means once per browser. "Always" means every eligible page visit.
    if (playMode === "once" && alreadyPlayed) {
      setVisible(false);
      markReady(location.pathname);
      return;
    }

    setVisible(true);
    const duration = Math.max(500, Math.min(30000, Number(wedding.loadingDuration || DEFAULT_DURATION)));
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(LOADER_PLAYED_KEY, "1"); } catch {}
      setVisible(false);
      markReady(location.pathname);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search, settingsReady, wedding.loadingAllPages, wedding.loadingDuration, wedding.loadingPlayMode]);

  const layout = wedding.loadingLayout === "horizontal" ? "flex-row" : "flex-col";
  const text1Size = Number(wedding.loadingTextSize || 30);
  const text2Size = Number(wedding.loadingText2Size || 24);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="site-loader"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-wedding-cream"
          aria-label="Wedding opening"
          role="status"
        >
          <div className={`loading-screen-content flex items-center justify-center gap-5 px-5 text-black ${layout}`}>
            <p className="font-display text-center leading-tight" style={{ fontSize: `${text1Size}px` }}>
              {wedding.loadingText || `${wedding.groomName || "Hareesh"} & ${wedding.brideName || "Prasanna"}`}
            </p>
            {wedding.loadingHeartEnabled !== false && (
              <motion.div
                animate={{ scale: [1, 1.18, 1], opacity: [0.45, 1, 0.45] }}
                transition={{ repeat: Infinity, duration: 1.15, ease: "easeInOut" }}
                aria-hidden="true"
              >
                <Heart className="h-16 w-16 shrink-0 fill-primary/60 text-primary" />
              </motion.div>
            )}
            <p className="font-display text-center leading-tight" style={{ fontSize: `${text2Size}px` }}>
              {wedding.loadingText2 || "Made with love"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
