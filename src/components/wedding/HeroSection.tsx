import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import heroFallback from "@/assets/hero-couple.jpg";
import { driveFileIdUrl } from "@/lib/homepageMedia";
import { getSiteSettings } from "@/lib/supabaseData";

const DEFAULT_WEDDING_DATE = "2026-04-04T08:59:00";

const parseWeddingDateTime = (dateValue: string, timeValue: string, timeZone = "Asia/Kolkata") => {
  const date = String(dateValue || "2026-04-04").trim();
  let time = String(timeValue || "08:59 AM").trim();
  const m = time.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?$/i);
  let hour = 8, minute = 59, second = 0;
  if (m) {
    hour = Number(m[1]);
    minute = Number(m[2] || 0);
    second = Number(m[3] || 0);
    const meridiem = (m[4] || "").toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
  } else {
    time = "08:59:00";
  }
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return new Date(DEFAULT_WEDDING_DATE);
  const [_, y, mo, d] = dateMatch;
  const naiveUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), hour, minute, second);
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(naiveUtc));
    const values = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
    const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    const offset = asUtc - naiveUtc;
    const target = new Date(naiveUtc - offset);
    return Number.isNaN(target.getTime()) ? new Date(DEFAULT_WEDDING_DATE) : target;
  } catch {
    const local = new Date(`${date}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:${String(second).padStart(2,"0")}`);
    return Number.isNaN(local.getTime()) ? new Date(DEFAULT_WEDDING_DATE) : local;
  }
};

const useWeddingCountdown = (target: Date) => {
  const calculate = () => Math.max(0, target.getTime() - Date.now());
  const [remaining, setRemaining] = useState(calculate);
  useEffect(() => {
    const tick = () => setRemaining(calculate());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target.getTime()]);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    mins: Math.floor((totalSeconds % 3600) / 60),
    secs: totalSeconds % 60,
    isPast: remaining <= 0,
  };
};

const HeroSection = () => {
  const [content, setContent] = useState<any>({});
  useEffect(() => { getSiteSettings().then((s) => setContent(s.wedding || {})).catch(() => {}); }, []);
  const groom = content.groomName || "Hareesh Kumar";
  const weddingDateTime = useMemo(() => parseWeddingDateTime(content.date, content.time, content.timezone || "Asia/Kolkata"), [content.date, content.time, content.timezone]);
  const heroImage = driveFileIdUrl(content.heroImageDriveId) || heroFallback;
  const bride = content.brideName || "Prasanna";
  const dateText = content.date ? new Date(`${content.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", " . ") : "04 . 04 . 2026";
  const { days, hours, mins, secs } = useWeddingCountdown(weddingDateTime);

  const countdownItems = [
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
          {content.countdownEnabled !== false && countdownItems.map(({ value, label }) => (
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
