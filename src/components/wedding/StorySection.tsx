import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import story1 from "@/assets/gallery/8-1.webp";
import story2 from "@/assets/gallery/drive-cover.webp";
import { getEvents, type EventRecord } from "@/lib/supabaseData";

const fallbackStories = [
  ["engagement", "Engagement", "01 Mar 2026", story1], ["pre-wedding", "Pre-Wedding Photoshoot", "22 Mar 2026", story1],
  ["lagnapathrika", "Lagnapathrika", "21 Mar 2026", story2], ["mangala-snanam", "Mangala Snanam", "01 Apr 2026", story2],
  ["haldi", "Haldi", "02 Apr 2026", story2], ["prathanam", "Prathanam", "03 Apr 2026", story2],
  ["upanayanam", "Upanayanam", "03 Apr 2026", story2], ["marriage", "Marriage", "04 Apr 2026", story2],
  ["satyanarayana-vratham", "Sathya Narayana Vratham", "05 Apr 2026", story2],
];

export default function StorySection() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRecord[]>([]);
  useEffect(() => { getEvents().then(setEvents); }, []);
  const cards = events.length ? events : fallbackStories.map(([slug, title, date, image], index) => ({ slug, title, date, description: `${title} memories of Hareesh & Prasanna.`, cover_image: image, sort_order: index } as EventRecord));

  return <section className="bg-wedding-cream py-20 md:py-28">
    <div className="wedding-container">
      <div className="mb-16 text-center"><p className="section-subtitle mb-3">Our Journey</p><h2 className="section-title">Events Timeline</h2><p className="mt-4 font-accent text-lg text-muted-foreground">A collection of beautiful moments from our journey</p></div>
      <div className="relative"><div className="absolute bottom-0 left-1/2 top-0 hidden w-px bg-primary/20 md:block" />
        {cards.map((story, index) => {
          const fallback = fallbackStories.find((x) => x[0] === story.slug);
          const image = story.cover_image || (fallback?.[3] as string) || story2;
          const date = story.date ? new Date(`${story.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : (fallback?.[2] as string || "");
          const isReverse = index % 2 === 1;
          return <motion.div key={story.slug} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .6, delay: index * .06 }} className={`mb-16 flex flex-col items-center gap-8 md:flex-row ${isReverse ? "md:flex-row-reverse" : ""}`}>
            <div className="md:w-1/2"><button onClick={() => navigate(`/gallery?event=${encodeURIComponent(story.slug)}`)} className="group block w-full text-left"><div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-xl"><img src={image} alt={story.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div></button></div>
            <div className="hidden h-4 w-4 shrink-0 rounded-full border-4 border-wedding-cream bg-primary md:block" />
            <div className={`text-center md:w-1/2 ${isReverse ? "md:text-right" : "md:text-left"}`}>
              <button onClick={() => navigate(`/gallery?event=${encodeURIComponent(story.slug)}`)} className="group text-left"><h3 className="font-display text-2xl transition-colors group-hover:text-primary">{story.title}</h3><p className="mb-3 mt-1 font-accent text-sm tracking-wider text-primary">{date}</p></button>
              <p className={`mx-auto max-w-md font-body text-sm leading-relaxed text-muted-foreground ${isReverse ? "md:ml-auto md:mr-0" : "md:ml-0 md:mr-auto"}`}>{story.description}</p>
              <button onClick={() => navigate(`/gallery?event=${encodeURIComponent(story.slug)}`)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-2 text-xs uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"><Lock size={13}/> Open Private Memories</button>
            </div>
          </motion.div>;
        })}
      </div>
    </div>
  </section>;
}
