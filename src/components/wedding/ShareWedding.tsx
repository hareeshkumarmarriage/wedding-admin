import { useState } from "react";
import { Check, Copy, Heart, Share2, X } from "lucide-react";

const ShareWedding = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
  const text = "Hareesh & Prasanna ❤️\nJoin us as we celebrate our wedding\n04 April 2026";
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch {} };
  const nativeShare = async () => { if (!navigator.share) return copy(); await navigator.share({ title: "Hareesh & Prasanna | Wedding", text, url }); };
  return <div className="fixed bottom-5 right-5 z-40">
    {open && <div className="mb-3 w-64 rounded-3xl border border-primary/10 bg-background/95 p-3 shadow-xl backdrop-blur" role="dialog" aria-label="Share wedding">
      <div className="mb-2 flex items-center justify-between px-2"><span className="font-display text-lg">Share Wedding</span><button onClick={() => setOpen(false)} aria-label="Close share menu" className="rounded-full p-2 hover:bg-muted"><X size={15}/></button></div>
      <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank", "noopener,noreferrer")} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-primary/5"><span className="grid h-9 w-9 place-items-center rounded-full bg-green-100 text-green-700">WA</span>Share with WhatsApp</button>
      {typeof navigator !== "undefined" && !!navigator.share && <button onClick={() => void nativeShare()} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-primary/5"><Share2 size={18} className="text-primary"/>More sharing options</button>}
      <button onClick={() => void copy()} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-primary/5">{copied ? <Check size={18} className="text-green-600"/> : <Copy size={18} className="text-primary"/>}{copied ? "Link copied" : "Copy link"}</button>
    </div>}
    <button onClick={() => setOpen((v) => !v)} aria-label="Share wedding" aria-expanded={open} className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg transition hover:scale-[1.02]"><Heart size={16} fill="currentColor"/>Share Wedding</button>
  </div>;
};
export default ShareWedding;
