import crypto from "node:crypto";

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const EVENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BYTES = 2_500_000;

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
  try {
    return new URL(origin).host === String(req.headers.host || "");
  } catch {
    return false;
  }
}

function getCookie(req, name) {
  const header = String(req.headers.cookie || "");
  const match = header.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function hasUnlock(req, event, codeVersion, secret) {
  const raw = getCookie(req, "wedding_unlock");
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  const expected = sign(payload, secret);
  if (signature.length !== expected.length) return false;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.event === event && data.codeVersion === codeVersion && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

function hasImageSignature(raw, mime) {
  if (mime === "image/jpeg") {
    return raw.length >= 3 && raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff;
  }
  if (mime === "image/png") {
    return raw.length >= 8 && raw.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === "image/webp") {
    return raw.length >= 12 && raw.subarray(0, 4).toString("ascii") === "RIFF" && raw.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

async function supabaseFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Forbidden" });
  if (limited(ip(req))) return res.status(429).json({ ok: false, error: "Too many uploads. Please wait." });

  const body = req.body || {};
  const event = typeof body.event === "string" ? body.event.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "Guest";
  const filename = typeof body.filename === "string" ? body.filename.trim() : "photo.jpg";
  const mime = typeof body.mime === "string" ? body.mime.toLowerCase() : "";
  const data = typeof body.data === "string" ? body.data : "";

  if (!EVENT_RE.test(event) || name.length < 1 || name.length > 80 || !/^image\/(jpeg|png|webp)$/.test(mime) || !data) {
    return res.status(400).json({ ok: false, error: "Invalid upload." });
  }

  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const unlockSecret = process.env.EVENT_UNLOCK_SECRET || "";
  if (!url || !key || !unlockSecret) {
    return res.status(503).json({ ok: false, error: "Guest uploads are not configured." });
  }

  try {
    // Guest uploads are private event functionality. Require the same signed,
    // short-lived unlock cookie used by the gallery/video APIs.
    const eventResult = await supabaseFetch(
      `${url}/rest/v1/events?select=slug,updated_at&slug=eq.${encodeURIComponent(event)}&is_active=eq.true&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!eventResult.response.ok || !Array.isArray(eventResult.body) || eventResult.body.length !== 1) {
      return res.status(404).json({ ok: false, error: "Event not found." });
    }
    const codeVersion = String(eventResult.body[0].updated_at || "");
    if (!hasUnlock(req, event, codeVersion, unlockSecret)) {
      return res.status(401).json({ ok: false, error: "Event is locked" });
    }

    const encoded = data.replace(/^data:[^;]+;base64,/, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
      return res.status(400).json({ ok: false, error: "Invalid image data." });
    }
    const raw = Buffer.from(encoded, "base64");
    if (!raw.length || raw.length > MAX_BYTES) {
      return res.status(400).json({ ok: false, error: "Please upload an image smaller than 2.5 MB." });
    }
    if (!hasImageSignature(raw, mime)) {
      return res.status(400).json({ ok: false, error: "The selected file is not a valid JPG, PNG or WebP image." });
    }

    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo.jpg";
    const path = `${event}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
    const r = await fetch(`${url}/storage/v1/object/wedding-guest-uploads/${encodeURIComponent(path).replaceAll("%2F", "/")}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": mime,
        "x-upsert": "false",
      },
      body: raw,
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("Guest upload failed", r.status, detail.slice(0, 300));
      return res.status(502).json({ ok: false, error: "Unable to upload this photo." });
    }
    return res.status(201).json({ ok: true, path });
  } catch (error) {
    console.error("Guest upload API error", error);
    return res.status(500).json({ ok: false, error: "Unable to upload this photo." });
  }
}
