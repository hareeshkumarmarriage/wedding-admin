import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { getSiteSettings } from "@/lib/supabaseData";
import { driveFileIdUrl } from "@/lib/homepageMedia";
import { useEffect, useState } from "react";
import groomFallback from "@/assets/gallery/4-1.webp";
import brideFallback from "@/assets/gallery/5-1.webp";

const CoupleSection = () => {
  const [content, setContent] = useState<any>({});
  const [groomFailed, setGroomFailed] = useState(false);
  const [brideFailed, setBrideFailed] = useState(false);
  useEffect(() => { getSiteSettings().then((s) => { setContent(s.wedding || {}); setGroomFailed(false); setBrideFailed(false); }).catch(() => {}); }, []);
  const groomImage = groomFailed ? groomFallback : (driveFileIdUrl(content.groomImageDriveId) || groomFallback);
  const brideImage = brideFailed ? brideFallback : (driveFileIdUrl(content.brideImageDriveId) || brideFallback);

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="wedding-container">
        <div className="grid md:grid-cols-5 gap-4 items-center justify-center place-items-center">
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="col-span-2 text-center">
            <div className="w-64 h-64 md:w-72 md:h-72 mx-auto rounded-full overflow-hidden border-4 border-wedding-blush shadow-lg mb-6">
              <img src={groomImage} alt={`${content.groomName || "Groom"} portrait`} className="w-full h-full object-cover" style={{ objectPosition: content.groomImagePosition || "center" }} loading="lazy" onError={() => setGroomFailed(true)} />
            </div>
            <p className="font-accent text-sm tracking-[0.3em] uppercase text-primary mb-2">The Groom</p>
            <h3 className="font-display text-2xl md:text-3xl text-foreground mb-3">{content.groomName || "Hareesh Kumar"}</h3>
          </motion.div>
          <AnimatePresence>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="col-span-5 md:col-span-1 flex items-center justify-center py-4 md:py-0">
              <Heart className="w-24 h-24 md:w-32 md:h-32 text-primary fill-primary/60" />
            </motion.div>
          </AnimatePresence>
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="col-span-2 text-center">
            <div className="w-64 h-64 md:w-72 md:h-72 mx-auto rounded-full overflow-hidden border-4 border-wedding-blush shadow-lg mb-6">
              <img src={brideImage} alt={`${content.brideName || "Bride"} portrait`} className="w-full h-full object-cover" style={{ objectPosition: content.brideImagePosition || "center" }} loading="lazy" onError={() => setBrideFailed(true)} />
            </div>
            <p className="font-accent text-sm tracking-[0.3em] uppercase text-primary mb-2">The Bride</p>
            <h3 className="font-display text-2xl md:text-3xl text-foreground mb-3">{content.brideName || "Prasanna"}</h3>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CoupleSection;
