import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Heart,
  Loader2,
  Pause,
  Play,
  Share2,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EventSecurityGate from "@/components/wedding/EventSecurityGate";
import { isEventUnlocked, lockEvent } from "@/lib/eventSecurity";
import { getEvent, recordAnalytics, type EventRecord } from "@/lib/supabaseData";
import {
  getDriveThumbnailUrl,
  getDriveVideoDownloadUrl,
  getDriveVideosPage,
  type DriveVideo,
} from "@/lib/googleDrive";

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

const wrap = (value: number, length: number) => length ? (value + length) % length : 0;

const DriveVideos = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const event = params.get("event") || "";
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const requested = Number(params.get("video"));
  const valid = Object.prototype.hasOwnProperty.call(EVENT_TITLES, event);
  const videosEnabled = eventRecord?.videos_enabled ?? true;
  const title = valid ? EVENT_TITLES[event] : "Our Videos";
  const [unlocked, setUnlocked] = useState(() => isEventUnlocked(event));

  useEffect(() => {
    let active = true;
    getEvent(event).then((record) => { if (active) setEventRecord(record); });
    return () => { active = false; };
  }, [event]);

  useEffect(() => {
    setUnlocked(isEventUnlocked(event));
  }, [event]);

  const [videos, setVideos] = useState<DriveVideo[]>([]);
  const [videoPageToken, setVideoPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const selectedVideo = useMemo(() => selectedIndex === null ? null : videos[selectedIndex] ?? null, [selectedIndex, videos]);

  const setVideoUrl = useCallback((index: number | null) => {
    const next = new URLSearchParams(params);
    if (index === null) next.delete("video"); else next.set("video", String(index));
    setParams(next, { replace: true });
  }, [params, setParams]);

  const selectVideo = useCallback((index: number) => {
    setSelectedIndex(index);
    setVideoUrl(index);
    setPlaying(false);
    void recordAnalytics(eventRecord?.id || event, "video_open", videos[index]?.id || null);
  }, [event, eventRecord?.id, setVideoUrl, videos]);

  const closeVideo = useCallback(() => {
    setSelectedIndex(null);
    setPlaying(false);
    setVideoUrl(null);
  }, [event, eventRecord?.id, setVideoUrl, videos]);

  const moveVideo = useCallback((direction: 1 | -1) => {
    if (selectedIndex === null || videos.length < 2) return;
    selectVideo(wrap(selectedIndex + direction, videos.length));
  }, [selectedIndex, selectVideo, videos.length]);

  useEffect(() => {
    if (!valid) {
      navigate("/#story", { replace: true });
      return;
    }

    if (!unlocked || !videosEnabled) {
      setVideos([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    setSelectedIndex(null);
    getDriveVideosPage(event, eventRecord?.videos_drive_folder_id || eventRecord?.drive_folder_id).then((page) => {
      if (active) {
        setVideos(page.items);
        setVideoPageToken(page.nextPageToken);
      }
    }).catch((err) => {
      if (active) {
        const message = err instanceof Error ? err.message : "Unable to load the videos.";
        if (/event is locked|401|unauthorized/i.test(message)) { lockEvent(event); setUnlocked(false); }
        setError(message);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [event, eventRecord?.videos_drive_folder_id, eventRecord?.drive_folder_id, videosEnabled, navigate, valid, unlocked]);

  useEffect(() => {
    if (!loading && valid && Number.isInteger(requested) && requested >= 0 && requested < videos.length) setSelectedIndex(requested);
  }, [loading, requested, valid, videos.length]);

  useEffect(() => {
    document.title = `${title} Videos | Hareesh & Prasanna`;
  }, [title]);

  useEffect(() => {
    if (selectedIndex === null) return;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVideo();
      if (e.key === "ArrowLeft") moveVideo(-1);
      if (e.key === "ArrowRight") moveVideo(1);
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  }, [closeVideo, moveVideo, selectedIndex]);

  const loadMoreVideos = async () => {
    if (!videoPageToken || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await getDriveVideosPage(event, eventRecord?.videos_drive_folder_id || eventRecord?.drive_folder_id, videoPageToken);
      setVideos((current) => [...current, ...page.items]);
      setVideoPageToken(page.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load more videos.");
    } finally {
      setLoadingMore(false);
    }
  };

  const shareVideo = async () => {
    if (selectedIndex === null) return;
    const url = new URL(window.location.href);
    url.searchParams.set("event", event);
    url.searchParams.set("video", String(selectedIndex));
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} Videos | Hareesh & Prasanna`, text: `A wedding video from ${title}`, url: url.toString() });
      } else {
        await navigator.clipboard.writeText(url.toString());
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 1800);
      }
    } catch { /* cancelled */ }
  };

  const downloadVideo = () => {
    if (!selectedVideo) return;
    const url = getDriveVideoDownloadUrl(selectedVideo);
    if (!url) return;
    // Do not buffer large 4K/high-bitrate videos into a Blob. Opening the
    // Drive media URL lets the browser use native streaming/range requests.
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      // Browser may require a direct user gesture.
    }
  };

  const touchStartHandler = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    setTouchStart({ x: t.clientX, y: t.clientY });
  };
  const touchEndHandler = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    setTouchStart(null);
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2) moveVideo(dx < 0 ? 1 : -1);
  };

  return <main className="min-h-screen bg-background">
    <EventSecurityGate
      event={event}
      title={title}
      description={`Private ${title} photos and videos.`}
      onUnlocked={() => setUnlocked(true)}
    />
    <section className="py-10 md:py-16">
      <div className="wedding-container">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate(`/gallery?event=${encodeURIComponent(event)}`)} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm hover:bg-white"><ArrowLeft size={17} /> Back to Photos</button>
          <div className="text-right"><p className="section-subtitle">Sweet Memories</p><p className="text-sm text-muted-foreground">{videos.length} Videos</p></div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Play size={24} fill="currentColor" /></div>
          <h1 className="section-title">{title} Videos</h1>
          <p className="mt-3 font-accent text-lg text-muted-foreground">Every video brings a little piece of our story back to life.</p>
        </motion.div>

        {loading && <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}
        {!loading && error && <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"><h2 className="mb-2 font-display text-2xl">We couldn't load the videos</h2><p className="text-sm text-muted-foreground">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Try Again</button></div>}
        {!loading && !error && videos.length === 0 && <div className="py-20 text-center"><Heart size={30} className="mx-auto mb-4 text-primary/50" /><h2 className="font-display text-2xl">No videos yet</h2><p className="mt-2 text-sm text-muted-foreground">Add MP4, MOV, WebM, or another video file to the Google Drive folder.</p></div>}
        {!loading && !error && videos.length > 0 && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{videos.map((video, index) => <VideoCard key={video.id} video={video} index={index} onClick={() => selectVideo(index)} />)}</div>}\n        {!loading && !error && videoPageToken && <div className="mt-8 flex justify-center"><button type="button" onClick={() => void loadMoreVideos()} disabled={loadingMore} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-full border border-primary/20 bg-white/80 px-6 py-3 text-sm shadow-sm hover:bg-white disabled:cursor-wait disabled:opacity-60">{loadingMore && <Loader2 size={16} className="animate-spin" />} {loadingMore ? "Loading…" : "Load More Videos"}</button></div>}
      </div>
    </section>

    <AnimatePresence>
      {selectedVideo && selectedIndex !== null && <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-3 md:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeVideo} onTouchStart={touchStartHandler} onTouchEnd={touchEndHandler}>
        <button type="button" aria-label="Close video" onClick={(e) => { e.stopPropagation(); closeVideo(); }} className="absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"><X size={22} /></button>
        {videos.length > 1 && <><button type="button" aria-label="Previous video" onClick={(e) => { e.stopPropagation(); moveVideo(-1); }} className="absolute left-2 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur sm:flex md:left-6"><ChevronLeft size={30} /></button><button type="button" aria-label="Next video" onClick={(e) => { e.stopPropagation(); moveVideo(1); }} className="absolute right-2 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur sm:flex md:right-6"><ChevronRight size={30} /></button></>}

        <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
          <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
            <video ref={videoRef} key={selectedVideo.id} src={getDriveVideoDownloadUrl(selectedVideo)} poster={selectedVideo.thumbnailLink ? getDriveThumbnailUrl(selectedVideo, 900) : undefined} controls playsInline preload="metadata" autoPlay onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="aspect-video h-auto max-h-[72vh] w-full bg-black" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-white">
            <div className="mr-2 max-w-[45vw] truncate rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur">{selectedVideo.name}</div>
            <span className="rounded-full bg-white/10 px-3 py-2 text-xs backdrop-blur">{selectedIndex + 1} / {videos.length}</span>
            <button type="button" onClick={() => void togglePlayback()} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs backdrop-blur hover:bg-white/20">{playing ? <Pause size={15} /> : <Play size={15} />} {playing ? "Playing" : "Play"}</button>
            <button type="button" onClick={() => void shareVideo()} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs backdrop-blur hover:bg-white/20"><Share2 size={15} /> {shareCopied ? "Copied" : "Share"}</button>
            <button type="button" disabled={downloading} onClick={() => void downloadVideo()} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-60"><Download size={15} /> {downloading ? "Preparing…" : "Download"}</button>
            <a href={selectedVideo.webViewLink || `https://drive.google.com/file/d/${selectedVideo.id}/view`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs backdrop-blur hover:bg-white/20"><ExternalLink size={15} /> Drive</a>
          </div>
          <p className="mt-3 text-center text-[11px] text-white/45">Swipe to browse • Use ← → to change video • Esc to close</p>
          <p className="mt-1 text-center text-[10px] text-white/30">If the browser cannot stream the file directly, use “Drive” to open Google's player.</p>
        </div>
      </motion.div>}
    </AnimatePresence>
  </main>;
};

const VideoCard = ({ video, index, onClick }: { video: DriveVideo; index: number; onClick: () => void }) => {
  const [loaded, setLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  return <motion.button type="button" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .05 }} transition={{ delay: Math.min(index * .05, .3), duration: .45 }} onClick={onClick} className="group overflow-hidden rounded-2xl bg-card text-left shadow-md ring-1 ring-black/5">
    <div className="relative aspect-video overflow-hidden bg-muted">{!loaded && !thumbError && <div className="absolute inset-0 animate-pulse bg-muted" />}{!thumbError ? <img src={getDriveThumbnailUrl(video, 1200)} alt={video.name} loading={index < 2 ? "eager" : "lazy"} decoding="async" sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" onLoad={() => setLoaded(true)} onError={() => setThumbError(true)} className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`} /> : <div className="flex h-full items-center justify-center bg-muted"><Play size={42} className="text-primary/50" fill="currentColor" /></div>}<div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg"><Play size={24} fill="currentColor" /></span></div></div>
    <div className="p-4"><p className="truncate font-body text-sm text-foreground">{video.name}</p><p className="mt-1 text-xs text-muted-foreground">Tap to watch</p></div>
  </motion.button>;
};

export default DriveVideos;
