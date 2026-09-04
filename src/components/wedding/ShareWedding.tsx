import { useEffect, useState } from "react";
import { Check, Copy, Facebook, Heart, Instagram, MessageCircle, Share2, X, Youtube } from "lucide-react";
import { getSiteSettings } from "@/lib/supabaseData";

const ShareWedding = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wedding, setWedding] = useState<any>({});
  const url = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";

  useEffect(() => {
    getSiteSettings().then((settings) => setWedding(settings.wedding || {})).catch(() => {});
  }, []);

  const title = `${wedding.groomName || "Hareesh"} & ${wedding.brideName || "Prasanna"} | Wedding`;
  const dateText = wedding.date
    ? new Date(`${wedding.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "04 April 2026";
  const text = `${title}\nJoin us as we celebrate our wedding\n${dateText}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const nativeShare = async () => {
    if (!navigator.share) return copy();
    try { await navigator.share({ title, text, url }); } catch {}
  };

  const openLink = (value: unknown) => {
    const link = String(value || "").trim();
    if (!link) return;
    try {
      const parsed = new URL(link);
      if (parsed.protocol !== "https:") return;
      window.open(parsed.toString(), "_blank", "noopener,noreferrer");
    } catch {}
  };

  const socialLinks = [
    { key: "instagramUrl", label: "Instagram", icon: Instagram },
    { key: "youtubeUrl", label: "YouTube", icon: Youtube },
    { key: "facebookUrl", label: "Facebook", icon: Facebook },
    { key: "whatsappUrl", label: "WhatsApp", icon: MessageCircle },
  ].filter((item) => wedding[item.key]);

  return <div className="fixed bottom-5 left-5 z-40">
    {open && <div className="mb-3 w-72 max-w-[calc(100vw-2.5rem)] rounded-3xl border border-primary/10 bg-background/95 p-3 shadow-xl backdrop-blur" role="dialog" aria-label="Share wedding">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="font-display text-lg">Share Wedding</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close share menu" className="rounded-full p-2 hover:bg-muted"><X size={15}/></button>
      </div>
      <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank", "noopener,noreferrer")} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-primary/5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-green-100 text-green-700"><MessageCircle size={18}/></span>
        Share with WhatsApp
      </button>
      {typeof navigator !== "undefined" && !!navigator.share && <button type="button" onClick={() => void nativeShare()} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-primary/5"><Share2 size={18} className="text-primary"/>More sharing options</button>}
      <button type="button" onClick={() => void copy()} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-primary/5">{copied ? <Check size={18} className="text-green-600"/> : <Copy size={18} className="text-primary"/>}{copied ? "Link copied" : "Copy link"}</button>
      {socialLinks.length > 0 && <div className="mt-2 border-t border-primary/10 pt-2">
        <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Follow us</p>
        {socialLinks.map(({ key, label, icon: Icon }) => <button type="button" key={key} onClick={() => openLink(wedding[key])} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm hover:bg-primary/5"><Icon size={18} className="text-primary"/>{label}</button>)}
      </div>}
    </div>}
    <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Share wedding" aria-expanded={open} className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg transition hover:scale-[1.02]"><Heart size={16} fill="currentColor"/>Share Wedding</button>
  </div>;
};

export default ShareWedding;
