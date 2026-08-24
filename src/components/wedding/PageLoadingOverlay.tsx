import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getSiteSettings } from "@/lib/supabaseData";

const DEFAULT_DURATION = 1200;

export default function PageLoadingOverlay() {
  const location = useLocation();
  const [wedding, setWedding] = useState<any>({});
  const [settingsReady, setSettingsReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const firstRoute = useRef(true);

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
    const showForThisRoute = isHome || wedding.loadingAllPages === true;

    if (!showForThisRoute) {
      setVisible(false);
      firstRoute.current = false;
      return;
    }

    setVisible(true);
    const duration = Math.max(500, Math.min(30000, Number(wedding.loadingDuration || DEFAULT_DURATION)));
    const timer = window.setTimeout(() => setVisible(false), duration);
    firstRoute.current = false;
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search, settingsReady, wedding.loadingAllPages, wedding.loadingDuration]);

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
          aria-label="Loading website"
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
