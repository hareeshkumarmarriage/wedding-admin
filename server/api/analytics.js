import { durableRateLimit } from "./rateLimit.js";
const attempts = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 30;
const TYPES = new Set(["event_view", "photo_open", "video_open"]);

function ip(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}
function limited(key) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    attempts.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === String(req.headers.host || ""); } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Forbidden" });
  if (limited(ip(req)) || !(await durableRateLimit(`analytics:${ip(req)}`, 60, 30))) return res.status(429).json({ ok: false, error: "Too many requests" });

  const body = req.body || {};
  const mediaType = typeof body.media_type === "string" ? body.media_type : "";
  const mediaId = body.media_id == null ? null : String(body.media_id);
  const eventId = body.event_id == null ? null : String(body.event_id);
  const visitorId = body.visitor_id == null ? null : String(body.visitor_id);
  if (!TYPES.has(mediaType) || (mediaId && mediaId.length > 500) || (visitorId && visitorId.length > 100) || (eventId && !/^[0-9a-f-]{36}$/i.test(eventId))) {
    return res.status(400).json({ ok: false, error: "Invalid analytics event" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ ok: false, error: "Analytics is not configured." });

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/gallery_views`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ event_id: eventId, media_type: mediaType, media_id: mediaId, visitor_id: visitorId }),
    });
    if (!response.ok) return res.status(502).json({ ok: false, error: "Unable to record analytics" });
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Unable to record analytics" });
  }
}
