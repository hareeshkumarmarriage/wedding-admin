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
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const allowed = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
    if (!allowed.has(host)) return "";
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
    else if (/^\/(shorts|embed)\//.test(url.pathname)) id = url.pathname.split("/").filter(Boolean)[1] || "";
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return "";
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch { return ""; }
}
