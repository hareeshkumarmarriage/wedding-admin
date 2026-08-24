import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Image as ImageIcon,
  Loader2,
  Pause,
  Play,
  PlayCircle,
  QrCode,
  Share2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getDriveImageUrl,
  getDrivePhotosPage,
  getDriveThumbnailUrl,
  getDriveVideosPage,
  type DrivePhoto,
} from "@/lib/googleDrive";
import { getFavoriteIds, toggleFavorite } from "@/lib/weddingStorage";
import { isEventUnlocked, lockEvent } from "@/lib/eventSecurity";
import { getEvent, recordAnalytics, saveFavorite, getRemoteFavoriteIds, savePhotoReaction, type EventRecord } from "@/lib/supabaseData";
import EventSecurityGate from "@/components/wedding/EventSecurityGate";
import story1 from "@/assets/gallery/8-1.webp";
import story2 from "@/assets/gallery/drive-cover.webp";
import story3 from "@/assets/gallery/drive-cover.webp";

export const EVENT_TITLES: Record<string, string> = {
  engagement: "Engagement",
  "pre-wedding": "Pre-Wedding Photoshoot",
  lagnapathrika: "Lagnapathrika",
  "mangala-snanam": "Mangala Snanam",
  haldi: "Haldi",
  prathanam: "Prathanam",
  upanayanam: "Upanayanam",
  marriage: "Marriage",
  "satyanarayana-vratham": "Sathya Narayana Vratham",
};

const wrapIndex = (value: number, length: number) =>
  length === 0 ? 0 : (value + length) % length;

const EVENT_COVERS: Record<string, string> = {
  engagement: story1,
  "pre-wedding": story1,
  lagnapathrika: story2,
  "mangala-snanam": story2,
  haldi: story3,
  prathanam: story3,
  upanayanam: story3,
  marriage: story3,
  "satyanarayana-vratham": story3,
};

const EVENT_MESSAGES: Record<string, string> = {
  engagement: "The beautiful beginning of our journey, filled with love, laughter, and blessings.",
  "pre-wedding": "A collection of smiles and little moments before we began our forever.",
  lagnapathrika: "A special traditional celebration surrounded by family and blessings.",
  "mangala-snanam": "An auspicious beginning to the wedding celebrations with our loved ones.",
  haldi: "Colors, laughter, music, and the people who made this day unforgettable.",
  prathanam: "A meaningful ceremony filled with tradition, blessings, and togetherness.",
  upanayanam: "A sacred and memorable family occasion filled with tradition and love.",
  marriage: "The day our forever began — a celebration of love, family, and a beautiful new chapter.",
  "satyanarayana-vratham": "A peaceful celebration of gratitude, devotion, and blessings for our married life.",
};


const DriveGallery = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const event = searchParams.get("event") || "memories";
  const requestedPhotoParam = searchParams.get("photo");
  const requestedPhoto = requestedPhotoParam === null ? null : Number(requestedPhotoParam);
  const qrAccess = searchParams.get("qr") === "1";
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const title = eventRecord?.title || EVENT_TITLES[event] || "Our Memories";
  const validEvent = Object.prototype.hasOwnProperty.call(EVENT_TITLES, event);
  const photosEnabled = eventRecord?.photos_enabled ?? true;
  const videosEnabled = eventRecord?.videos_enabled ?? true;
  const slideshowEnabled = eventRecord?.slideshow_enabled ?? true;
  const qrEnabled = eventRecord?.qr_enabled ?? true;
  const [unlocked, setUnlocked] = useState(() => isEventUnlocked(event));

  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [photoPageToken, setPhotoPageToken] = useState<string | null>(null);
  const [videoPageToken, setVideoPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [videoCount, setVideoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteIds(event));
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [slideshow, setSlideshow] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    getEvent(event).then((record) => { if (active) setEventRecord(record); });
    return () => { active = false; };
  }, [event]);

  useEffect(() => {
    setUnlocked(isEventUnlocked(event));
  }, [event]);

  const visiblePhotos = useMemo(
    () => favoritesOnly ? photos.filter((photo) => favorites.includes(photo.id)) : photos,
    [favorites, favoritesOnly, photos]
  );

  const selectedPhoto = useMemo(
    () => selectedIndex === null ? null : visiblePhotos[selectedIndex] ?? null,
    [selectedIndex, visiblePhotos]
  );

  const updatePhotoUrl = useCallback((index: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (index === null) next.delete("photo");
    else next.set("photo", String(index));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const selectPhoto = useCallback((index: number) => {
    setSelectedIndex(index);
    updatePhotoUrl(index);
  }, [updatePhotoUrl]);

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
    setSlideshow(false);
    updatePhotoUrl(null);
  }, [updatePhotoUrl]);

  const movePhoto = useCallback((direction: 1 | -1) => {
    if (selectedIndex === null || visiblePhotos.length < 2) return;
    selectPhoto(wrapIndex(selectedIndex + direction, visiblePhotos.length));
  }, [selectPhoto, selectedIndex, visiblePhotos.length]);

  useEffect(() => {
    let active = true;
    setSelectedIndex(null);
    setFavoritesOnly(false);

    if (!validEvent || !unlocked) {
      setPhotos([]);
      setVideoCount(0);
      setPhotoPageToken(null);
      setVideoPageToken(null);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError("");

    Promise.all([
      photosEnabled
        ? getDrivePhotosPage(event, eventRecord?.drive_folder_id)
        : Promise.resolve({ items: [], nextPageToken: null }),
      videosEnabled
        ? getDriveVideosPage(event, eventRecord?.drive_folder_id)
        : Promise.resolve({ items: [], nextPageToken: null }),
    ])
      .then(async ([photoPage, videoPage]) => {
        if (!active) return;
        setPhotos(photoPage.items);
        setPhotoPageToken(photoPage.nextPageToken);
        setVideoPageToken(videoPage.nextPageToken);
        // The gallery only needs the first video page for a fast count/preview.
        setVideoCount(videoPage.items.length + (videoPage.nextPageToken ? 1 : 0));
        const remoteFavorites = await getRemoteFavoriteIds(eventRecord?.id || event);
        setFavorites(Array.from(new Set([...getFavoriteIds(event), ...remoteFavorites])));
        void recordAnalytics(eventRecord?.id || event, "event_view");
      })
      .catch((err) => {
        if (active) {
          const message = err instanceof Error ? err.message : "Unable to load the gallery.";
          if (/event is locked|401|unauthorized/i.test(message)) { lockEvent(event); setUnlocked(false); }
          setError(message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [event, eventRecord?.drive_folder_id, photosEnabled, videosEnabled, unlocked, validEvent]);

  useEffect(() => {
    if (!validEvent) navigate("/#story", { replace: true });
  }, [navigate, validEvent]);

  useEffect(() => {
    if (!loading && visiblePhotos.length > 0 && requestedPhoto !== null && Number.isInteger(requestedPhoto) && requestedPhoto >= 0 && requestedPhoto < visiblePhotos.length) {
      setSelectedIndex(requestedPhoto);
    }
  }, [loading, requestedPhoto, visiblePhotos.length]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Hareesh & Prasanna`;
    return () => { document.title = previous; };
  }, [title]);

  useEffect(() => {
    if (selectedIndex === null) return;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") movePhoto(1);
      if (e.key === "ArrowLeft") movePhoto(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [closeLightbox, movePhoto, selectedIndex]);

  useEffect(() => {
    if (!slideshow || selectedIndex === null || visiblePhotos.length < 2) return;
    const timer = window.setInterval(() => movePhoto(1), 4500);
    return () => window.clearInterval(timer);
  }, [movePhoto, selectedIndex, slideshow, visiblePhotos.length]);

  useEffect(() => {
    setImageLoading(selectedPhoto !== null);
    setImageError(false);
  }, [selectedPhoto]);

  useEffect(() => {
    if (selectedIndex === null || visiblePhotos.length === 0) return;
    const indexes = [selectedIndex, wrapIndex(selectedIndex + 1, visiblePhotos.length), wrapIndex(selectedIndex - 1, visiblePhotos.length)];
    const images = indexes.map((index) => {
      const image = new Image();
      image.src = getDriveImageUrl(visiblePhotos[index]);
      return image;
    });
    return () => images.forEach((image) => { image.src = ""; });
  }, [selectedIndex, visiblePhotos]);

  const togglePhotoFavorite = (id: string) => {
    const isFavorite = toggleFavorite(event, id);
    void saveFavorite(eventRecord?.id || event, id, isFavorite);
    setFavorites((current) => isFavorite ? [...current, id] : current.filter((item) => item !== id));
  };

  const loadMorePhotos = async () => {
    if (!photoPageToken || loadingMore || !photosEnabled) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await getDrivePhotosPage(event, eventRecord?.drive_folder_id, photoPageToken);
      setPhotos((current) => [...current, ...page.items]);
      setPhotoPageToken(page.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load more photos.");
    } finally {
      setLoadingMore(false);
    }
  };

  const sharePhoto = async () => {
    if (selectedIndex === null) return;
    const url = new URL(window.location.href);
    url.searchParams.set("event", event);
    url.searchParams.set("photo", String(selectedIndex));
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} | Hareesh & Prasanna`, text: `A memory from ${title}`, url: url.toString() });
      } else {
        await navigator.clipboard.writeText(url.toString());
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 1800);
      }
    } catch { /* user cancelled */ }
  };

  const downloadPhoto = () => {
    if (!selectedPhoto) return;
    const url = getDriveImageUrl(selectedPhoto, 2200);
    if (!url) return;
    // Avoid fetch()->Blob for multi-megapixel images; it duplicates the full
    // file in browser memory. Let the browser/Drive handle the transfer.
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const qrUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const eventUrl = `${window.location.origin}/gallery?event=${encodeURIComponent(event)}&qr=1`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(eventUrl)}`;
  }, [event]);

  const touchStartHandler = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const touchEndHandler = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    setTouchStart(null);
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2) movePhoto(dx < 0 ? 1 : -1);
  };

  if (!validEvent) return null;

  return (
    <main className="min-h-screen bg-background">
      <EventSecurityGate
        event={event}
        title={title}
        description={eventRecord?.description || EVENT_MESSAGES[event]}
        onUnlocked={() => setUnlocked(true)}
        force={qrAccess}
      />
      <section className="py-10 md:py-16">
        <div className="wedding-container">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => navigate("/#story")} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm hover:bg-white">
              <ArrowLeft size={17} /> Back to Events
            </button>
            <button type="button" disabled={!qrEnabled} onClick={() => setQrOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm hover:bg-white">
              <QrCode size={17} /> QR Code
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 overflow-hidden rounded-[2rem] bg-white/70 shadow-xl ring-1 ring-primary/10">
            <div className="grid md:grid-cols-[0.8fr_1.2fr]">
              <div className="relative min-h-[230px] overflow-hidden md:min-h-[300px]">
                <img src={eventRecord?.cover_image || EVENT_COVERS[event] || story1} alt={`${title} memories`} className="absolute inset-0 h-full w-full object-cover" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-foreground shadow-sm">Our memories</div>
              </div>
              <div className="flex flex-col justify-center p-7 text-center md:p-10 md:text-left">
                <p className="section-subtitle">A Chapter of Our Story</p>
                <h1 className="section-title mt-2">{title}</h1>
                <p className="mx-auto mt-4 max-w-xl font-accent text-lg leading-relaxed text-muted-foreground md:mx-0">{eventRecord?.description || EVENT_MESSAGES[event] || "Every picture holds a little piece of our story."}</p>
                {(eventRecord?.date || eventRecord?.venue_name) && <div className="mt-4 text-sm text-muted-foreground">{eventRecord?.date && <span>{new Date(`${eventRecord.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>}{eventRecord?.venue_name && <span>{eventRecord?.date ? " · " : ""}{eventRecord.venue_name}</span>}</div>}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm"><ImageIcon size={16} /> {photos.length} Photos</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm"><PlayCircle size={16} /> {videoCount}{videoPageToken ? "+" : ""} Videos</span>
              <button type="button" disabled={!videosEnabled} onClick={() => navigate(`/videos?event=${encodeURIComponent(event)}`)} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm hover:bg-white"><PlayCircle size={16} /> Watch Videos</button>
              <button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${favoritesOnly ? "border-primary bg-primary/10" : "border-primary/20 bg-white/70"}`}><Heart size={16} fill={favoritesOnly ? "currentColor" : "none"} /> Favorites ({favorites.length})</button>
              <button type="button" disabled={visiblePhotos.length === 0 || !slideshowEnabled} onClick={() => { setSlideshow(true); selectPhoto(0); }} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm disabled:opacity-50 hover:bg-white"><PlayCircle size={16} /> Play Slideshow</button>
            </div>
            </div>
          </div>
          </motion.div>

          {loading && <GallerySkeleton />}

          {!loading && error && <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"><h2 className="mb-2 font-display text-2xl">We couldn't load the gallery</h2><p className="text-sm text-muted-foreground">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Try Again</button></div>}

          {!loading && !error && visiblePhotos.length === 0 && <div className="py-20 text-center"><Heart size={30} className="mx-auto mb-4 text-primary/50" fill="currentColor" /><h2 className="font-display text-2xl">{favoritesOnly ? "No favorite photos yet" : "No photos found"}</h2><p className="mt-2 text-sm text-muted-foreground">{favoritesOnly ? "Tap the heart on any photo to save it here." : "Add images to the Google Drive folder and refresh this page."}</p></div>}

          {!loading && !error && visiblePhotos.length > 0 && <div className="columns-2 gap-3 md:columns-3 md:gap-5 lg:columns-4">{visiblePhotos.map((photo, index) => <PhotoCard key={photo.id} photo={photo} index={index} favorite={favorites.includes(photo.id)} onFavorite={() => togglePhotoFavorite(photo.id)} onClick={() => selectPhoto(index)} />)}</div>}\n\n          {!loading && !error && !favoritesOnly && photoPageToken && <div className="mt-8 flex justify-center"><button type="button" onClick={() => void loadMorePhotos()} disabled={loadingMore} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-full border border-primary/20 bg-white/80 px-6 py-3 text-sm shadow-sm hover:bg-white disabled:cursor-wait disabled:opacity-60">{loadingMore && <Loader2 size={16} className="animate-spin" />} {loadingMore ? "Loading…" : "Load More Photos"}</button></div>}
        </div>
      </section>

      <AnimatePresence>
        {selectedPhoto && selectedIndex !== null && (
          <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-3 md:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeLightbox} onTouchStart={touchStartHandler} onTouchEnd={touchEndHandler}>
            <button type="button" aria-label="Close photo" onClick={(e) => { e.stopPropagation(); closeLightbox(); }} className="absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"><X size={22} /></button>

            {visiblePhotos.length > 1 && <><button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); movePhoto(-1); }} className="absolute left-2 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur sm:flex md:left-6"><ChevronLeft size={30} /></button><button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); movePhoto(1); }} className="absolute right-2 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur sm:flex md:right-6"><ChevronRight size={30} /></button></>}

            <div className="relative flex h-full w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {imageLoading && !imageError && <div className="absolute rounded-full bg-white/10 p-4"><Loader2 size={28} className="animate-spin text-white" /></div>}
              {!imageError ? <img key={selectedPhoto.id} src={getDriveImageUrl(selectedPhoto)} alt={selectedPhoto.name} draggable={false} onLoad={() => setImageLoading(false)} onError={() => { setImageLoading(false); setImageError(true); }} className={`max-h-[86vh] max-w-[94vw] rounded-lg object-contain shadow-2xl transition-opacity ${imageLoading ? "opacity-0" : "opacity-100"}`} /> : <div className="rounded-2xl bg-white/10 p-8 text-center text-white"><Heart size={32} className="mx-auto mb-3 text-white/60" /><p>Unable to display this photo.</p></div>}
            </div>

            <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 p-1.5 text-white backdrop-blur">
              <button type="button" onClick={(e) => { e.stopPropagation(); togglePhotoFavorite(selectedPhoto.id); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Favorite photo"><Heart size={18} fill={favorites.includes(selectedPhoto.id) ? "currentColor" : "none"} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); void savePhotoReaction(eventRecord?.id || event, selectedPhoto.id, "love"); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Send love reaction">❤️</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); void savePhotoReaction(eventRecord?.id || event, selectedPhoto.id, "smile"); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Send smile reaction">😍</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); void sharePhoto(); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Share photo">{shareCopied ? <Check size={18} /> : <Share2 size={18} />}</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); void downloadPhoto(); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Download photo"><Download size={18} /></button>
              <button type="button" disabled={!slideshowEnabled} onClick={(e) => { e.stopPropagation(); setSlideshow((value) => !value); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label={slideshow ? "Pause slideshow" : "Start slideshow"}>{slideshow ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button>
              <span className="px-2 text-sm">{selectedIndex + 1} / {visiblePhotos.length}</span>
            </div>
            <p className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 text-[11px] text-white/50">Swipe or use ← → • Use the play button for slideshow</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {qrOpen && <motion.div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQrOpen(false)}>
          <motion.div className="relative w-full max-w-sm rounded-3xl bg-wedding-cream p-7 text-center shadow-2xl" initial={{ scale: .94, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setQrOpen(false)} className="absolute right-4 top-4 rounded-full p-2 hover:bg-black/5"><X size={18} /></button>
            <QrCode className="mx-auto mb-3 text-primary" size={28} />
            <h2 className="font-display text-2xl">Scan {title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Share this event gallery with your family and friends.</p>
            <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3 shadow-sm"><img src={qrUrl} alt={`QR code for ${title} gallery`} width={260} height={260} /></div>
            <button type="button" onClick={() => window.print()} className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground">Print QR Code</button>
            <p className="mt-3 text-[10px] text-muted-foreground">QR image is generated by a public QR service from the gallery URL.</p>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </main>
  );
};

const PhotoCard = ({ photo, index, favorite, onFavorite, onClick }: { photo: DrivePhoto; index: number; favorite: boolean; onFavorite: () => void; onClick: () => void; }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .05 }} transition={{ delay: Math.min(index * .025, .35), duration: .4 }} className="group relative mb-3 overflow-hidden rounded-xl bg-muted shadow-sm md:mb-5">
    <button type="button" onClick={onClick} className="block w-full text-left">
      <div className="relative min-h-[140px] bg-muted">{!loaded && !error && <div className="absolute inset-0 animate-pulse bg-muted" />}{!error ? <img src={getDriveThumbnailUrl(photo, 700)} alt={photo.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw" onLoad={() => setLoaded(true)} onError={() => setError(true)} className={`block h-auto w-full object-cover transition duration-700 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`} /> : <div className="flex min-h-[180px] items-center justify-center"><Heart size={26} className="text-primary/40" /></div>}<span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" /></div>
    </button>
    <button type="button" aria-label={favorite ? "Remove from favorites" : "Add to favorites"} onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"><Heart size={18} fill={favorite ? "currentColor" : "none"} /></button>
  </motion.div>;
};

const GallerySkeleton = () => <div className="columns-2 gap-3 md:columns-3 md:gap-5 lg:columns-4">{Array.from({ length: 12 }).map((_, i) => <div key={i} className={`mb-3 break-inside-avoid animate-pulse rounded-xl bg-muted md:mb-5 ${i % 3 === 0 ? "h-72" : i % 2 === 0 ? "h-52" : "h-64"}`} />)}</div>;

export default DriveGallery;
