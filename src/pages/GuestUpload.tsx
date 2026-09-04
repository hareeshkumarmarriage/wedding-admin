import { useState } from "react";
import { Check, Heart, ImagePlus, Loader2, Video } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const MAX_BYTES = 3_000_000;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"];

export default function GuestUpload() {
  const [params] = useSearchParams();
  const event = params.get("event") || "";
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const isVideo = file ? file.type.startsWith("video/") : false;

  const submit = async () => {
    if (!event || !file || !name.trim()) {
      setError("Please enter your name and choose a photo or video.");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      setError("Use JPG, PNG, WebP, MP4, WebM or MOV.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Please choose a photo or video smaller than 3 MB.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/guest-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          name: name.trim(),
          filename: file.name,
          mime: file.type,
          data,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || "Upload failed.");
      setDone(true);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-wedding-cream p-5">
      <div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-7 text-center shadow-sm">
        <Heart className="mx-auto text-primary" fill="currentColor" size={26} />
        <p className="section-subtitle mt-4">Wedding Memories</p>
        <h1 className="font-display text-3xl">Share a Memory ❤️</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upload a favorite photo or short video from the celebration.</p>

        {done ? (
          <div className="mt-7 rounded-2xl bg-green-50 p-5 text-green-700">
            <Check className="mx-auto mb-2" />
            <p className="font-medium">Your memory was received!</p>
            <button onClick={() => setDone(false)} className="mt-4 rounded-full border px-4 py-2 text-xs">Upload another</button>
          </div>
        ) : (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              className="mt-6 h-12 w-full rounded-2xl border px-4"
            />

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 p-7 text-sm hover:bg-primary/5">
              {isVideo ? <Video className="mb-2 text-primary" /> : <ImagePlus className="mb-2 text-primary" />}
              {file ? file.name : "Choose a photo or video"}
              <span className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, MP4, WebM or MOV · max 3 MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              disabled={busy}
              onClick={() => void submit()}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : isVideo ? <Video size={16} /> : <ImagePlus size={16} />}
              {busy ? "Uploading…" : isVideo ? "Upload Video" : "Upload Photo"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
