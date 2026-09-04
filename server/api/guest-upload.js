import { durableRateLimit } from "./rateLimit.js";
import crypto from "node:crypto";

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const MAX_BYTES = 3_000_000;

const TYPES = {
  "image/jpeg": { kind: "photo", label: "photo" },
  "image/png": { kind: "photo", label: "photo" },
  "image/webp": { kind: "photo", label: "photo" },
  "video/mp4": { kind: "video", label: "video" },
  "video/webm": { kind: "video", label: "video" },
  "video/quicktime": { kind: "video", label: "video" },
};

function ip(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
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

function matchesSignature(raw, mime) {
  if (mime === "image/jpeg") return raw.length >= 3 && raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff;
  if (mime === "image/png") return raw.length >= 8 && raw.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp") return raw.length >= 12 && raw.toString("ascii", 0, 4) === "RIFF" && raw.toString("ascii", 8, 12) === "WEBP";
  if (mime === "video/webm") return raw.length >= 4 && raw.toString("ascii", 0, 4) === "\x1aE\xdf\xa3";
  if (mime === "video/mp4" || mime === "video/quicktime") {
    return raw.length >= 12 && raw.toString("ascii", 4, 8) === "ftyp";
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Forbidden" });

  const clientIp = ip(req);
  if (limited(clientIp) || !(await durableRateLimit(`upload:${clientIp}`, 600, MAX_ATTEMPTS))) {
    return res.status(429).json({ ok: false, error: "Too many uploads. Please wait." });
  }

  const body = req.body || {};
  const event = typeof body.event === "string" ? body.event.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "Guest";
  const filename = typeof body.filename === "string" ? body.filename.trim() : "upload";
  const mime = typeof body.mime === "string" ? body.mime : "";
  const data = typeof body.data === "string" ? body.data : "";
  const type = TYPES[mime];

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event) ||
    name.length < 1 || name.length > 80 ||
    !type || !data
  ) {
    return res.status(400).json({ ok: false, error: "Invalid upload." });
  }

  const encoded = data.replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    return res.status(400).json({ ok: false, error: "Invalid upload data." });
  }

  const raw = Buffer.from(encoded, "base64");
  if (!raw.length || raw.length > MAX_BYTES) {
    return res.status(400).json({
      ok: false,
      error: `Please choose a ${type.label} smaller than 3 MB.`,
    });
  }

  if (!matchesSignature(raw, mime)) {
    return res.status(400).json({ ok: false, error: "The uploaded file does not match its media type." });
  }

  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return res.status(503).json({ ok: false, error: "Guest uploads are not configured." });

  try {
    const eventCheck = await fetch(
      `${url}/rest/v1/events_public?select=id&slug=eq.${encodeURIComponent(event)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!eventCheck.ok) return res.status(502).json({ ok: false, error: "Unable to verify the event." });

    const eventRows = await eventCheck.json();
    if (!eventRows.length) return res.status(404).json({ ok: false, error: "Event not found." });

    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "upload";
    const path = `${event}/${type.kind}/${Date.now()}-${crypto.randomUUID()}-${safe}`;

    const upload = await fetch(
      `${url}/storage/v1/object/wedding-guest-uploads/${encodeURIComponent(path).replaceAll("%2F", "/")}`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": mime,
          "x-upsert": "false",
        },
        body: raw,
      },
    );

    if (!upload.ok) {
      return res.status(502).json({ ok: false, error: `Unable to upload this ${type.label}.` });
    }

    return res.status(201).json({ ok: true, kind: type.kind, path });
  } catch {
    return res.status(500).json({ ok: false, error: `Unable to upload this ${type.label}.` });
  }
}
