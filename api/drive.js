import crypto from "node:crypto";

const PAGE_SIZE = 60;
const EVENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sign(value) {
  return crypto.createHmac("sha256", process.env.EVENT_UNLOCK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "").update(value).digest("base64url");
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

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const event = String(req.query?.event || "");
  const type = req.query?.type === "video" ? "video/" : "image/";
  const pageToken = typeof req.query?.pageToken === "string" ? req.query.pageToken : "";
  if (!EVENT_RE.test(event)) return res.status(400).json({ ok: false, error: "Invalid event" });

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY || "";
  if (!supabaseUrl || !serviceKey || !driveKey) return res.status(503).json({ ok: false, error: "Media service is not configured" });

  try {
    let folderId = "";
    if (event === "homepage") {
      const settingsResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/site_settings?select=value&key=eq.wedding&limit=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (!settingsResponse.ok) return res.status(502).json({ ok: false, error: "Unable to load homepage media configuration" });
      const settingsRows = await settingsResponse.json();
      folderId = String(settingsRows[0]?.value?.galleryDriveFolderId || "").trim();
      if (!folderId) return res.status(404).json({ ok: false, error: "Homepage gallery folder is not configured" });
    } else {
      const eventResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/events?select=drive_folder_id,updated_at&slug=eq.${encodeURIComponent(event)}&is_active=eq.true&limit=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (!eventResponse.ok) return res.status(502).json({ ok: false, error: "Unable to load event media configuration" });
      const rows = await eventResponse.json();
      const codeVersion = rows[0]?.updated_at || "";
      if (!hasUnlock(req, event, codeVersion)) return res.status(401).json({ ok: false, error: "Event is locked" });
      folderId = rows[0]?.drive_folder_id;
      if (!folderId) return res.status(404).json({ ok: false, error: "Event media folder not configured" });
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
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    const body = await response.text();
    if (!response.ok) return res.status(502).json({ ok: false, error: "Unable to load Google Drive media" });
    return res.status(200).send(body);
  } catch (error) {
    console.error("Drive API error", error);
    return res.status(500).json({ ok: false, error: "Unable to load media" });
  }
}
