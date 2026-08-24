import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, Lock, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isEventUnlocked, unlockEvent } from "@/lib/eventSecurity";

interface EventSecurityGateProps {
  event: string;
  title: string;
  description?: string;
  onUnlocked?: () => void;
  force?: boolean;
}

export default function EventSecurityGate({
  event,
  title,
  description,
  onUnlocked,
  force = false,
}: EventSecurityGateProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => force || !isEventUnlocked(event));
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setOpen(force || !isEventUnlocked(event));
    setCode("");
    setError("");
  }, [event, force]);

  const [verifying, setVerifying] = useState(false);

  const verify = async () => {
    if (!code.trim() || verifying) return;
    setVerifying(true);
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, code: code.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Incorrect security code.");
      }
      unlockEvent(event);
      setOpen(false);
      setCode("");
      setError("");
      onUnlocked?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify the security code.";
      if (/failed to fetch|networkerror|load failed/i.test(message)) {
        setError("The event verification service is unavailable. Check your local server environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and EVENT_UNLOCK_SECRET are required for event verification.");
      } else {
        setError(message);
      }
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const close = () => {
    setOpen(false);
    navigate("/#story", { replace: true });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 bg-wedding-cream p-7 text-center shadow-2xl md:p-9"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
          >
            <X size={19} />
          </button>

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart size={29} fill="currentColor" className="fill-primary/20" />
          </div>

          <div className="mb-3 flex items-center justify-center gap-2 text-primary">
            <Lock size={15} />
            <span className="font-body text-xs uppercase tracking-[0.2em]">Private Memories</span>
          </div>

          <h2 className="font-display text-3xl text-foreground">{title}</h2>

          {description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}

          <p className="mt-5 text-sm text-foreground/80">
            Enter the security code to view the photos and videos for this event.
          </p>

          <input
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") verify();
              if (e.key === "Escape") close();
            }}
            autoFocus
            autoComplete="off"
            placeholder="Enter security code"
            className="mt-5 h-12 w-full rounded-full border border-primary/20 bg-white/70 px-5 text-center text-sm tracking-widest outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={close}
              className="h-12 flex-1 rounded-full border border-primary/20 text-sm text-muted-foreground transition hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void verify()}
              disabled={verifying}
              className="flex h-12 flex-1 disabled:cursor-wait disabled:opacity-60 items-center justify-center gap-2 rounded-full bg-primary text-sm text-primary-foreground shadow-md transition hover:opacity-90"
            >
              {verifying ? "Checking…" : <>Unlock <ArrowRight size={16} /></>}
            </button>
          </div>

          <p className="mt-5 font-accent text-xs italic text-muted-foreground">With love, Hareesh &amp; Prasanna</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
