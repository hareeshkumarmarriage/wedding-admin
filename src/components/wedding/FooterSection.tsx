import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { getSiteSettings } from "@/lib/supabaseData";

const FooterSection = () => {
  const [content, setContent] = useState<any>({});
  useEffect(() => { getSiteSettings().then((s) => setContent(s.wedding || {})).catch(() => {}); }, []);
  return (
    <footer className="py-12 bg-wedding-cream border-t border-border">
      <div className="wedding-container text-center">
        <h3 className="font-display text-2xl text-foreground mb-2">{content.groomName || "Hareesh Kumar"} & {content.brideName || "Prasanna"}</h3>
        <p className="font-accent text-sm text-muted-foreground tracking-wider mb-4">{content.date ? new Date(`${content.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "04 . 04 . 2026"}</p>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <span className="font-body text-xs">{content.footerText || "Made with love for our special day"}</span>
          <Heart className="w-3 h-3 text-primary fill-primary" />
          <span className="font-body text-xs">{content.footerCopyright || ""}</span>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
