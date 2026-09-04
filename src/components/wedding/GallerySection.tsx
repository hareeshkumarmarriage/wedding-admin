import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { getSiteSettings } from "@/lib/supabaseData";

type WeddingSettings = {
  galleryHeading?: string;
  galleryDescription?: string;
};

const GallerySection = () => {
  const [content, setContent] = useState<WeddingSettings>({});

  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((settings) => {
        if (active) setContent((settings.wedding || {}) as WeddingSettings);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="wedding-container">
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="section-subtitle mb-3"
          >
            {content.galleryHeading || "Sweet Memories"}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-title"
          >
            {content.galleryDescription || "Our Captured Moments"}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mt-8 max-w-xl rounded-3xl border border-primary/10 bg-white/70 p-8 shadow-sm"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Camera size={24} />
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Photos and videos are available inside each event gallery so every celebration has its own memories, favorites, slideshow, and secure access.
            </p>
            <a
              href="#events"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-primary-foreground hover:opacity-90"
            >
              Explore Events
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
