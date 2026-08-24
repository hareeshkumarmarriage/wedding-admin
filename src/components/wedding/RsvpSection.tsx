import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getSiteSettings, submitRsvp } from "@/lib/supabaseData";
import rsvpBg from "@/assets/rsvp-bg.jpg";

const RsvpSection = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [attending, setAttending] = useState<"yes" | "no" | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [content, setContent] = useState<any>({});
  useEffect(() => { getSiteSettings().then((s) => setContent(s.wedding || {})).catch(() => {}); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attending) return toast({ title: "Please choose an RSVP option", description: "Let us know if you can join us." });
    setSaving(true);
    try {
      await submitRsvp({ name: name.trim(), email: email.trim(), phone: phone.trim(), attending: attending === "yes", guest_count: attending === "yes" ? guestCount : 0, message: message.trim() });
      setDone(true);
      toast({ title: "Thank you!", description: attending === "yes" ? "We look forward to celebrating with you." : "Thank you for letting us know." });
      setName(""); setEmail(""); setPhone(""); setMessage(""); setAttending(null); setGuestCount(1);
    } catch (error) { toast({ title: "RSVP could not be saved", description: error instanceof Error ? error.message : "Please try again." }); }
    finally { setSaving(false); }
  };

  return <section id="rsvp" className="relative overflow-hidden py-20 md:py-28">
    <div className="absolute inset-0"><img src={rsvpBg} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-background/85 backdrop-blur-sm" /></div>
    <div className="relative z-10 wedding-container">
      <div className="mx-auto max-w-xl text-center">
        <p className="section-subtitle mb-3">Be Our Guest</p>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="section-title mb-4">{content.rsvpHeading || "RSVP"}</motion.h2>
        <p className="mb-8 font-accent text-lg text-muted-foreground">{content.rsvpDescription || "Your presence would mean the world to us."}</p>
        {done ? <div className="rounded-3xl border border-primary/15 bg-background/85 p-8 shadow-sm"><p className="font-display text-3xl">Thank you ❤️</p><p className="mt-3 text-sm text-muted-foreground">Your response has been recorded. We can't wait to celebrate together.</p><button onClick={() => setDone(false)} className="mt-6 rounded-full border border-primary/20 px-5 py-2 text-sm text-primary">Submit another response</button></div> : <motion.form initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-primary/10 bg-background/80 p-6 text-left shadow-lg backdrop-blur md:p-8">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" required autoComplete="name" className="bg-background/80 border-primary/20 font-body" />
          <div className="grid gap-4 sm:grid-cols-2"><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email (optional)" autoComplete="email" className="bg-background/80 border-primary/20 font-body" /><Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="Phone (optional)" autoComplete="tel" className="bg-background/80 border-primary/20 font-body" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><button type="button" aria-pressed={attending === "yes"} onClick={() => setAttending("yes")} className={`rounded-full border-2 px-4 py-3 text-sm transition ${attending === "yes" ? "border-primary bg-primary text-primary-foreground" : "border-primary/20 hover:border-primary"}`}>Yes, I'll be there ❤️</button><button type="button" aria-pressed={attending === "no"} onClick={() => setAttending("no")} className={`rounded-full border-2 px-4 py-3 text-sm transition ${attending === "no" ? "border-primary bg-primary text-primary-foreground" : "border-primary/20 hover:border-primary"}`}>Sorry, I can't</button></div>
          {attending === "yes" && <div><label htmlFor="guest-count" className="mb-2 block text-sm">Number of Guests</label><select id="guest-count" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="h-11 w-full rounded-xl border border-primary/20 bg-background px-3 text-sm">{[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>}
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={4} placeholder="A message for the couple (optional)" className="w-full rounded-xl border border-primary/20 bg-background/80 p-3 text-sm outline-none focus:border-primary" />
          <Button disabled={saving} type="submit" className="w-full rounded-full bg-primary px-10 py-3 font-body text-sm uppercase tracking-[0.2em] text-primary-foreground">{saving ? "Saving…" : "Confirm RSVP"}</Button>
        </motion.form>}
      </div>
    </div>
  </section>;
};
export default RsvpSection;
