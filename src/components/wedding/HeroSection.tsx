import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import heroFallback from "@/assets/hero-couple.jpg";
import { driveFileIdUrl } from "@/lib/homepageMedia";

const DEFAULT_WEDDING_DATE = "2026-04-04T08:59:00";

const parseWeddingDateTime = (dateValue: string, timeValue: string, timeZone = "Asia/Kolkata") => {
  const date = String(dateValue || "2026-04-04").trim();
  const rawTime = String(timeValue || "08:59 AM").trim().toUpperCase();
  const match = rawTime.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?$/);
  let hour = 8, minute = 59, second = 0;
  if (match) {
    hour = Number(match[1]);
    minute = Number(match[2] || 0);
    second = Number(match[3] || 0);
    const meridiem = match[4] || "";
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
  }
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return new Date(DEFAULT_WEDDING_DATE);
  const [, y, mo, d] = dateMatch;
  const wallClockUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), hour, minute, second);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(wallClockUtc));
    const values = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
    const displayedUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    return new Date(wallClockUtc - (displayedUtc - wallClockUtc));
  } catch {
    return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`);
  }
};

const useWeddingCountdown = (target: Date) => {
  const targetMs = target.getTime();
  const calculate = () => targetMs - Date.now();
  const [difference, setDifference] = useState(calculate);
  useEffect(() => {
    setDifference(calculate());
    const timer = window.setInterval(() => setDifference(calculate()), 1000);
    return () => window.clearInterval(timer);
  }, [targetMs]);
  const isPast = difference < 0;
  const totalSeconds = Math.floor(Math.abs(difference) / 1000);
  return { days: Math.floor(totalSeconds / 86400), hours: Math.floor((totalSeconds % 86400) / 3600), mins: Math.floor((totalSeconds % 3600) / 60), secs: totalSeconds % 60, isPast };
};

type WeddingSettings = Record<string, unknown> & {
  groomName?: string;
  brideName?: string;
  date?: string;
  time?: string;
  timezone?: string;
  heroTitle?: string;
  heroImageDriveId?: string;
  countdownEnabled?: boolean;
};

const HeroSection = ({ settings }: { settings?: WeddingSettings }) => {
  const content = settings || {};
  const groom = content.groomName || "Hareesh Kumar";
  const bride = content.brideName || "Prasanna";
  const weddingDateTime = useMemo(() => parseWeddingDateTime(String(content.date || ""), String(content.time || ""), String(content.timezone || "Asia/Kolkata")), [content.date, content.time, content.timezone]);
  const heroImage = driveFileIdUrl(String(content.heroImageDriveId || "")) || heroFallback;
  const dateText = content.date ? new Date(`${content.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", " . ") : "04 . 04 . 2026";
  const { days, hours, mins, secs, isPast } = useWeddingCountdown(weddingDateTime);
  const countdownItems = [{ value: days, label: "Days" }, { value: hours, label: "Hours" }, { value: mins, label: "Mins" }, { value: secs, label: "Secs" }];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-wedding-cream">
      <div className="absolute inset-0"><img src={heroImage} alt="Hareesh Kumar and Prasanna together" className="w-full h-full object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-b from-wedding-cream/60 via-transparent to-wedding-cream" /></div>
      <div className="relative z-10 text-center px-4">
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="section-subtitle mb-4">{String(content.heroTitle || "We Are Married")}</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }} className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-[0.1em] text-foreground mb-2">{groom}</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="font-accent text-2xl md:text-3xl text-primary italic mb-2">&amp;</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }} className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-[0.1em] text-foreground mb-8">{bride}</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }} className="font-accent text-xl md:text-2xl tracking-[0.2em] text-muted-foreground mb-12">{dateText} - {String(content.time || "08 . 59 . 00")}</motion.p>
        <p className="mb-4 font-body text-xs uppercase tracking-[0.25em] text-muted-foreground">{isPast ? "Time since our wedding" : "Countdown to our wedding"}</p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1 }} className="flex justify-center gap-3 md:gap-6 lg:gap-10">
          {content.countdownEnabled !== false && countdownItems.map(({ value, label }) => <div key={label} className="text-center"><div className="w-14 h-14 md:w-20 md:h-20 rounded-full border-2 border-primary/30 flex items-center justify-center mb-2 bg-background/50 backdrop-blur-sm"><span className="font-display text-xl md:text-3xl text-foreground">{String(value).padStart(2, "0")}</span></div><span className="font-body text-[9px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase text-muted-foreground">{label}</span></div>)}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
