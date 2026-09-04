const ID_RE = /^[A-Za-z0-9_-]{10,}$/;

export default async function handler(req, res) {
  // Wedding media is admin-configurable; never let Vercel/browser caches keep
  // an old cover image or video after an Admin change.
  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const id = String(req.query?.id || "").trim();
  if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Invalid Drive file ID" });

  const driveKey = process.env.GOOGLE_DRIVE_API_KEY || "";
  if (!driveKey) return res.status(503).json({ ok: false, error: "Google Drive media service is not configured" });

  try {
    const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseUrl || !serviceKey) return res.status(503).json({ ok: false, error: "Media service is not configured" });
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const settingsResponse = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=value&key=eq.wedding&limit=1`, { headers, cache: "no-store" });
    const settingsRows = settingsResponse.ok ? await settingsResponse.json() : [];
    const wedding = settingsRows?.[0]?.value || {};
    const allowedIds = new Set([
      wedding.heroImageDriveId,
      wedding.groomImageDriveId,
      wedding.brideImageDriveId,
      wedding.loadingLogoDriveId,
      wedding.introVideoDriveId,
    ].map(String).filter(Boolean));
    const eventsResponse = await fetch(`${supabaseUrl}/rest/v1/events_public?select=cover_image_drive_id,photos_drive_folder_id,photos_drive_folder_id_2,videos_drive_folder_id,videos_drive_folder_id_2,drive_folder_id`, { headers, cache: "no-store" });
    const publicFolders = new Set();
    if (eventsResponse.ok) {
      for (const ev of await eventsResponse.json()) {
        for (const value of [ev.cover_image_drive_id, ev.photos_drive_folder_id, ev.photos_drive_folder_id_2, ev.videos_drive_folder_id, ev.videos_drive_folder_id_2, ev.drive_folder_id]) {
          if (value) { const v = String(value); allowedIds.add(v); publicFolders.add(v); }
        }
      }
    }

    const metadataUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`);
    metadataUrl.searchParams.set("key", driveKey);
    metadataUrl.searchParams.set("fields", "id,name,mimeType,thumbnailLink,resourceKey,parents");
    const metadataResponse = await fetch(metadataUrl, { cache: "no-store" });
    const metadata = await metadataResponse.json().catch(() => ({}));
    if (!metadataResponse.ok) {
      const message = metadata?.error?.message || "Google Drive file is not accessible.";
      return res.status(metadataResponse.status === 404 ? 404 : metadataResponse.status === 403 ? 403 : 502).json({ ok: false, error: message });
    }

    const parentAllowed = Array.isArray(metadata.parents) && metadata.parents.some((parent) => publicFolders.has(String(parent)));
    if (!allowedIds.has(id) && !parentAllowed) return res.status(403).json({ ok: false, error: "Media file is not published." });
    const isImage = String(metadata.mimeType || "").startsWith("image/");
    let response;
    if (isImage && metadata.thumbnailLink) {
      const thumbnail = new URL(metadata.thumbnailLink);
      const requestedSize = Number(req.query?.size || 1600);
      const safeSize = Number.isFinite(requestedSize) ? Math.max(400, Math.min(requestedSize, 2000)) : 1600;
      if (thumbnail.searchParams.has("sz")) thumbnail.searchParams.set("sz", `w${safeSize}`);
      else if (/=s\d+/.test(thumbnail.toString())) thumbnail.href = thumbnail.toString().replace(/=s\d+/, `=s${safeSize}`);
      response = await fetch(thumbnail, { method: req.method, cache: "no-store" });
    } else {
      const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`);
      url.searchParams.set("alt", "media");
      url.searchParams.set("key", driveKey);
      if (metadata.resourceKey) url.searchParams.set("resourceKey", metadata.resourceKey);
      const mediaHeaders = {};
      const range = req.headers.range;
      if (typeof range === "string" && range) mediaHeaders.Range = range;
      response = await fetch(url, { method: req.method, headers: mediaHeaders, cache: "no-store" });
    }

    if (!response.ok) {
      const message = response.status === 404 || response.status === 403
        ? "Google Drive file is not accessible. Make sure the file is shared for public website access."
        : "Unable to load Google Drive media.";
      return res.status(response.status === 404 ? 404 : response.status === 403 ? 403 : 502).json({ ok: false, error: message });
    }

    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");
    const etag = response.headers.get("etag");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
    if (etag) res.setHeader("ETag", etag);

    res.status(response.status);
    if (req.method === "HEAD" || !response.body) return res.end();

    const { Readable } = await import("node:stream");
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error("Drive media proxy error", error);
    return res.status(502).json({ ok: false, error: "Unable to load Google Drive media." });
  }
}
