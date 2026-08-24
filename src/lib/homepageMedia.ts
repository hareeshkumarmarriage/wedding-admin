export function driveFileIdUrl(fileId: string, mode: "view" | "download" = "view") {
  const id = String(fileId || "").trim();
  if (!id) return "";
  if (mode === "download") {
    const key = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || "";
    if (key) {
      return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(key)}`;
    }
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }
  return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
}

export function youtubeEmbedUrl(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("youtube.com/embed/")) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.slice(1);
    else if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2] || "";
      else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || "";
    }
    if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
  } catch {
    // Ignore invalid URLs and let the UI show the supplied value.
  }
  return raw;
}
