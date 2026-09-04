import crypto from "node:crypto";

const PAGE_SIZE = 60;
const EVENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FOLDER_RE = /^[A-Za-z0-9_-]{10,}$/;
const REQUEST_TIMEOUT_MS = 8000;
const RETRIES = 2;

function sign(value) {
  return crypto.createHmac("sha256", process.env.EVENT_UNLOCK_SECRET || "").update(value).digest("base64url");
}
function getCookie(req, name) {
  const header = String(req.headers.cookie || "");
  const match = header.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}
function hasUnlock(req, event, codeVersion) {
  const raw = getCookie(req, "wedding_unlock");
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !process.env.EVENT_UNLOCK_SECRET) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.event === event && data.codeVersion === codeVersion && Number(data.exp) > Date.now();
  } catch { return false; }
}

async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!([429, 500, 502, 503, 504].includes(response.status)) || attempt === RETRIES) return response;
      await response.arrayBuffer().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("Upstream request failed");
}

function upstreamStatus(status) {
  if (status === 401 || status === 403) return status;
  if (status === 404) return 404;
  if (status === 429) return 429;
  return 502;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const event = String(req.query?.event || "");
  const type = req.query?.type === "video" ? "video/" : "image/";
  const pageToken = typeof req.query?.pageToken === "string" ? req.query.pageToken : "";
  const requestedFolderId = typeof req.query?.folderId === "string" ? req.query.folderId.trim() : "";
  if (!EVENT_RE.test(event)) return res.status(400).json({ ok: false, error: "Invalid event" });
  if (requestedFolderId && !FOLDER_RE.test(requestedFolderId)) return res.status(400).json({ ok: false, error: "Invalid media folder ID" });

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY || "";
  if (!supabaseUrl || !serviceKey || !driveKey) return res.status(503).json({ ok: false, error: "Media service is not configured" });

  try {
    const base = supabaseUrl.replace(/\/$/, "");
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    let folderId = "";
    if (event === "homepage") {
      const settingsResponse = await fetchWithRetry(`${base}/rest/v1/site_settings?select=value&key=eq.wedding&limit=1`, { headers });
      if (!settingsResponse.ok) {
        console.error("Drive configuration lookup failed", settingsResponse.status);
        return res.status(settingsResponse.status === 429 ? 429 : 502).json({ ok: false, error: "Unable to load homepage media configuration" });
      }
      const settingsRows = await settingsResponse.json();
      folderId = String(settingsRows[0]?.value?.galleryDriveFolderId || "").trim();
      if (!folderId || !FOLDER_RE.test(folderId)) return res.status(404).json({ ok: false, error: "Homepage gallery folder is not configured" });
    } else {
      const eventResponse = await fetchWithRetry(`${base}/rest/v1/events?select=drive_folder_id,photos_drive_folder_id,photos_drive_folder_id_2,videos_drive_folder_id,videos_drive_folder_id_2,updated_at&slug=eq.${encodeURIComponent(event)}&is_active=eq.true&limit=1`, { headers });
      if (!eventResponse.ok) {
        console.error("Drive event lookup failed", eventResponse.status);
        return res.status(eventResponse.status === 429 ? 429 : 502).json({ ok: false, error: "Unable to load event media configuration" });
      }
      const rows = await eventResponse.json();
      if (!rows.length) return res.status(404).json({ ok: false, error: "Event not found" });
      const codeVersion = rows[0]?.updated_at || "";
      if (!hasUnlock(req, event, codeVersion)) return res.status(401).json({ ok: false, error: "Event is locked" });
      const configuredFolders = type === "video/"
        ? [rows[0]?.videos_drive_folder_id, rows[0]?.videos_drive_folder_id_2, rows[0]?.drive_folder_id]
        : [rows[0]?.photos_drive_folder_id, rows[0]?.photos_drive_folder_id_2, rows[0]?.drive_folder_id];
      const allowedFolders = configuredFolders.map((value) => String(value || "").trim()).filter((value) => FOLDER_RE.test(value));
      folderId = requestedFolderId || allowedFolders[0] || "";
      if (!folderId) return res.status(404).json({ ok: false, error: "Event media folder not configured" });
      if (!allowedFolders.includes(folderId)) return res.status(403).json({ ok: false, error: "Requested media folder is not configured for this event" });
    }

    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false and mimeType contains '${type}'`,
      key: driveKey,
      pageSize: String(PAGE_SIZE),
      orderBy: "name_natural",
      fields: type === "image/"
        ? "nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,resourceKey,imageMediaMetadata(width,height))"
        : "nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,resourceKey,videoMediaMetadata(width,height,durationMillis))",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files?${params}`);
    const body = await response.text();
    if (!response.ok) {
      let message = "Unable to load Google Drive media";
      try {
        const parsed = JSON.parse(body);
        message = parsed?.error?.message || parsed?.error || message;
      } catch {}
      console.error("Google Drive listing failed", response.status, message);
      return res.status(upstreamStatus(response.status)).json({ ok: false, error: message });
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(body);
  } catch (error) {
    console.error("Drive API error", error);
    return res.status(502).json({ ok: false, error: "Google Drive is temporarily unavailable" });
  }
}
