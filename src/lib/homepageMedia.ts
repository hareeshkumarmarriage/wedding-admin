export function driveFileIdUrls(fileId: string, mode: "view" | "download" = "view"): string[] {
  const id = String(fileId || "").trim();
  if (!id) return [];
  const key = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || "";
  const urls = mode === "download"
    ? [`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`, `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`, ...(key ? [`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(key)}`] : [])]
    : [`https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`, `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=view&confirm=t`, ...(key ? [`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(key)}`] : [])];
  return [...new Set(urls)];
}

export function driveFileIdUrl(fileId: string, mode: "view" | "download" = "view") {
  return driveFileIdUrls(fileId, mode)[0] || "";
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
