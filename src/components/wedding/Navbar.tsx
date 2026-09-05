import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { getSiteSettings } from "@/lib/supabaseData";

type WeddingSettings = Record<string, any>;

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [wedding, setWedding] = useState<WeddingSettings>({});

  useEffect(() => {
    getSiteSettings().then((settings) => setWedding(settings.wedding || {})).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "#home", visible: wedding.navigationHome !== false },
    { label: "Couple", href: "#couple", visible: true },
    { label: "Events", href: "#story", visible: wedding.navigationEvents !== false && wedding.storyEnabled !== false },
    { label: "Memories", href: "#gallery", visible: wedding.galleryEnabled !== false },
    { label: "Venue", href: "#events", visible: wedding.eventsEnabled !== false },
    { label: "Guestbook", href: "#guestbook", visible: wedding.navigationGuestbook === true && wedding.guestbookEnabled !== false },
  ].filter((link) => link.visible);

  return (
    <nav className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${wedding.navigationSticky === false ? "absolute" : "fixed"} ${scrolled ? "bg-background/95 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"}`}>
      <div className="wedding-container flex items-center justify-between">
        <a href="#home" className="font-display text-xl text-foreground tracking-wider">{`${String(wedding.groomName || "Hareesh").charAt(0)} & ${String(wedding.brideName || "Prasanna").charAt(0)}`}</a>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => <a key={link.href} href={link.href} className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-primary transition-colors">{link.label}</a>)}
        </div>
        <button type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && <div className="md:hidden bg-background/95 backdrop-blur-md border-t border-border py-4">{navLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="block px-6 py-2 font-body text-sm text-muted-foreground hover:text-primary">{link.label}</a>)}</div>}
    </nav>
  );
};

export default Navbar;
