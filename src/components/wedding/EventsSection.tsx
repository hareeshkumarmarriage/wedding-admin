import { motion } from "framer-motion";
import { Wine, Church, Camera, UtensilsCrossed, LogOut, Music2, Cake } from "lucide-react";
import { getSiteSettings, getEvents, type EventRecord } from "@/lib/supabaseData";
import { useEffect, useState } from "react";

const defaultEvents = [
  { icon: Wine, title: "Welcome Drinks", time: "11:00 AM" },
  { icon: Church, title: "Ceremony", time: "8:59 AM" },
  { icon: Camera, title: "Photos", time: "12:00 PM" },
  { icon: UtensilsCrossed, title: "Dinner", time: "1:00 PM" },
//  { icon: Cake, title: "Cake Cutting", time: "9:00 PM" },
//  { icon: Music, title: "First Dance", time: "10:00 PM" },
  { icon: LogOut, title: "Depart", time: "2:00 PM" },
];

const EventsSection = () => {
  const [content, setContent] = useState<any>({});
  const [eventList, setEventList] = useState<EventRecord[]>([]);
  useEffect(() => { getSiteSettings().then((s) => setContent(s.wedding || {})).catch(() => {}); getEvents().then(setEventList).catch(() => {}); }, []);
  const weddingEvent = eventList.find((e) => e.slug === "marriage");
  const timeline = Array.isArray(content.timeline) && content.timeline.length ? content.timeline.filter((x:any)=>x.visible !== false) : defaultEvents;
  return (
    <section className="py-20 md:py-28 bg-wedding-cream">
      <div className="wedding-container">
        <div className="text-center mb-6">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="section-subtitle mb-3">
            When & Where
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="section-title mb-4">
            Our Wedding Programs
          </motion.h2>
          <p className="font-accent text-lg text-muted-foreground">{content.date ? new Date(`${content.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" }) : "Saturday, 04 Apr 2026"}, {content.time || "8:00 AM"} – 02:00 PM</p>
          <p className="font-body text-sm text-muted-foreground mt-1">{weddingEvent?.venue_name || content.venue || "Kolping Community Hall"} <br/> {weddingEvent?.venue_address || content.address || "5th Ln, Postal Colony, Donka Road, Guntur-522002, Andhra Pradesh"}</p>
        </div>

        {(weddingEvent?.maps_url || content.mapsUrl) && <div className="flex justify-center text-center"><a href={weddingEvent?.maps_url || content.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-primary/20 px-5 py-2 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">Open Location in Google Maps</a></div>}

        <div className="mt-12 max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/20" />

            {timeline.map((event: any, i: number) => {
              const Icon = typeof event.icon === "function" ? event.icon : (event.icon === "Church" ? Church : event.icon === "Camera" ? Camera : event.icon === "UtensilsCrossed" ? UtensilsCrossed : event.icon === "Music2" ? Music2 : event.icon === "Cake" ? Cake : event.icon === "LogOut" ? LogOut : Wine);
              const isLeft = i % 2 === 0;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center mb-8 ${isLeft ? "flex-row" : "flex-row-reverse"}`}
                >
                  <div className={`w-[45%] ${isLeft ? "text-right pr-8" : "text-left pl-8"}`}>
                    <h4 className="font-display text-lg text-foreground">{event.title}</h4>
                    <p className="font-accent text-sm text-primary">{event.time}</p>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center z-10 shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>

                  <div className="w-[45%]" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
