export function driveFileIdUrl(fileId: string, _mode: "view" | "download" = "view") {
  const id = String(fileId || "").trim();
  if (!id) return "";
  // Use the same-origin media proxy in production. This avoids Google Drive
  // redirects being blocked by CSP and keeps the Drive API key server-side.
  return `/api/media?id=${encodeURIComponent(id)}`;
}

export function driveFileIdFallbackUrls(fileId: string, _mode: "view" | "download" = "view") {
  const id = String(fileId || "").trim();
  if (!id) return [];
  const urls = [
    `/api/media?id=${encodeURIComponent(id)}`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
  ];
  return [...new Set(urls)];
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
  } catch {}
  return raw;
}
