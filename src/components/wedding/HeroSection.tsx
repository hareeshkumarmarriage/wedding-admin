import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import heroFallback from "@/assets/hero-couple.jpg";
import { driveFileIdUrl } from "@/lib/homepageMedia";
import { getSiteSettings } from "@/lib/supabaseData";

const DEFAULT_START_DATE = "2026-04-04T08:59:01";

const useElapsedTime = (start: Date) => {
  const [timePassed, setTimePassed] = useState({
    years: 0,
    days: 0,
    hours: 0,
    mins: 0,
    secs: 0,
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();

      // Calculate completed years
      let years = now.getFullYear() - start.getFullYear();

      const anniversary = new Date(start);
      anniversary.setFullYear(start.getFullYear() + years);

      // If this year's anniversary hasn't happened yet,
      // subtract one year.
      if (anniversary > now) {
        years--;

        anniversary.setFullYear(start.getFullYear() + years);
      }

      // Calculate remaining time after completed years
      const diff = Math.max(
        0,
        now.getTime() - anniversary.getTime()
      );

      setTimePassed({
        years,
        days: Math.floor(
          diff / (1000 * 60 * 60 * 24)
        ),
        hours: Math.floor(
          (diff / (1000 * 60 * 60)) % 24
        ),
        mins: Math.floor(
          (diff / (1000 * 60)) % 60
        ),
        secs: Math.floor(
          (diff / 1000) % 60
        ),
      });
    };

    // Run immediately
    tick();

    // Update every second
    const id = setInterval(tick, 1000);

    // Cleanup interval
    return () => clearInterval(id);
  }, [start]);

  return timePassed;
};

const HeroSection = () => {
  const [content, setContent] = useState<any>({});
  useEffect(() => { getSiteSettings().then((s) => setContent(s.wedding || {})).catch(() => {}); }, []);
  const groom = content.groomName || "Hareesh Kumar";
  const startDate = useMemo(() => { const raw = `${content.date || "2026-04-04"}T${content.time || "08:59 AM"}`; const parsed = new Date(raw); return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_START_DATE) : parsed; }, [content.date, content.time]);
  const heroImage = driveFileIdUrl(content.heroImageDriveId) || heroFallback;
  const bride = content.brideName || "Prasanna";
  const dateText = content.date ? new Date(`${content.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", " . ") : "04 . 04 . 2026";
  const {
    years,
    days,
    hours,
    mins,
    secs,
  } = useElapsedTime(startDate);

  const countdownItems = [
    { value: years, label: "Years" },
    { value: days, label: "Days" },
    { value: hours, label: "Hours" },
    { value: mins, label: "Mins" },
    { value: secs, label: "Secs" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-wedding-cream">

      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Hareesh Kumar and Prasanna together"
          className="w-full h-full object-cover opacity-30"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-wedding-cream/60 via-transparent to-wedding-cream" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4">

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="section-subtitle mb-4"
        >
          {content.heroTitle || "We Are Married"}
        </motion.p>

        {/* Groom */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 0.2,
          }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-[0.1em] text-foreground mb-2"
        >
          {groom}
        </motion.h1>

        {/* & */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 1,
            delay: 0.5,
          }}
          className="font-accent text-2xl md:text-3xl text-primary italic mb-2"
        >
          &amp;
        </motion.p>

        {/* Bride */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 0.4,
          }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-[0.1em] text-foreground mb-8"
        >
          {bride}
        </motion.h1>

        {/* Wedding Date */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 1,
            delay: 0.8,
          }}
          className="font-accent text-xl md:text-2xl tracking-[0.2em] text-muted-foreground mb-12"
        >
          {dateText} - {content.time || "08 . 59 . 00"}
        </motion.p>

        {/* Elapsed Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 1,
          }}
          className="flex justify-center gap-3 md:gap-6 lg:gap-10"
        >
          {countdownItems.map(({ value, label }) => (
            <div
              key={label}
              className="text-center"
            >
              {/* Number Circle */}
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-full border-2 border-primary/30 flex items-center justify-center mb-2 bg-background/50 backdrop-blur-sm">

                <span className="font-display text-xl md:text-3xl text-foreground">
                  {String(value).padStart(2, "0")}
                </span>

              </div>

              {/* Label */}
              <span className="font-body text-[9px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default HeroSection;
