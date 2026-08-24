import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getDriveImageUrl, getDrivePhotosPage, type DrivePhoto } from "@/lib/googleDrive";
import { getSiteSettings } from "@/lib/supabaseData";
import galleryFallback from "@/assets/gallery-1.jpg";

const GallerySection = () => {
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [folderId, setFolderId] = useState("");
  const [content, setContent] = useState<any>({});

  useEffect(() => {
    let active = true;
    getSiteSettings().then(async (settings) => {
      const folder = String(settings.wedding?.galleryDriveFolderId || "").trim();
      if (!active) return;
      setFolderId(folder);
      setContent(settings.wedding || {});
      if (!folder) return;
      try {
        const page = await getDrivePhotosPage("homepage", folder);
        if (active) setPhotos(page.items.slice(0, Number(settings.wedding?.galleryLimit || 14)));
      } catch {
        if (active) setPhotos([]);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const images = photos.length ? photos : [{ id: "fallback", name: "Wedding moment", mimeType: "image/jpeg", thumbnailLink: galleryFallback } as DrivePhoto];

  return <section className="py-20 md:py-28 bg-background">
    <div className="wedding-container">
      <div className="text-center mb-16">
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="section-subtitle mb-3">{content.galleryHeading || "Sweet Memories"}</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="section-title">{content.galleryDescription || "Our Captured Moments"}</motion.h2>
        {folderId && <a href={`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs uppercase tracking-widest text-primary">View gallery folder</a>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[200px]">
        {images.map((img, i) => <motion.div key={img.id || i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className={`relative overflow-hidden rounded-xl shadow-md group ${i === 0 || i === 5 ? "md:row-span-2" : ""}`}>
          <img src={getDriveImageUrl(img, 1600) || galleryFallback} alt={img.name || `Wedding moment ${i + 1}`} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        </motion.div>)}
      </div>
    </div>
  </section>;
};

export default GallerySection;
