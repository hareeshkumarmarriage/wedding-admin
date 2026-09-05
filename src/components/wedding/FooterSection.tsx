import { Facebook, Heart, Instagram, MessageCircle, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { getSiteSettings } from "@/lib/supabaseData";

const FooterSection = () => {
  const [content, setContent] = useState<any>({});
  useEffect(() => { getSiteSettings().then((s) => setContent(s.wedding || {})).catch(() => {}); }, []);

  if (content.footerEnabled === false) return null;
  const links = [
    { key: "instagramUrl", label: "Instagram", icon: Instagram },
    { key: "youtubeUrl", label: "YouTube", icon: Youtube },
    { key: "facebookUrl", label: "Facebook", icon: Facebook },
    { key: "whatsappUrl", label: "WhatsApp", icon: MessageCircle },
  ];
  const openLink = (value: unknown) => { const link = String(value || "").trim(); if (!link) return; try { const parsed = new URL(link); if (parsed.protocol !== "https:") return; window.open(parsed.toString(), "_blank", "noopener,noreferrer"); } catch {} };

  return <footer className="py-12 bg-wedding-cream border-t border-border">
    <div className="wedding-container text-center">
      <h3 className="font-display text-2xl text-foreground mb-2">{content.groomName || "Hareesh Kumar"} & {content.brideName || "Prasanna"}</h3>
      <p className="font-accent text-sm text-muted-foreground tracking-wider mb-4">{content.date ? new Date(`${content.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "04 . 04 . 2026"}</p>
      <div className="flex items-center justify-center gap-2 text-muted-foreground"><span className="font-body text-xs">{content.footerText || "Made with love for our special day"}</span><Heart className="w-3 h-3 text-primary fill-primary" /><span className="font-body text-xs">{content.footerCopyright || ""}</span></div>
      {content.footerShowSocial !== false && links.some(({ key }) => content[key]) && <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{links.filter(({ key }) => content[key]).map(({ key, label, icon: Icon }) => <button type="button" key={key} onClick={() => openLink(content[key])} aria-label={label} title={label} className="grid h-10 w-10 place-items-center rounded-full border border-primary/10 text-muted-foreground transition hover:bg-primary/5 hover:text-primary"><Icon size={17}/></button>)}</div>}
    </div>
  </footer>;
};
export default FooterSection;
