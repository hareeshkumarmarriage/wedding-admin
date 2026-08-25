import { durableRateLimit } from "./rateLimit.js";
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const NAME_RE = /[\p{L}\p{N}]/u;

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || "unknown")
    .split(",")[0].trim();
}

function rateLimit(key) {
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

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Forbidden" });

  const ip = getIp(req);
  if (rateLimit(ip) || !(await durableRateLimit(`guestbook:${ip}`, 600, 3))) {
    return res.status(429).json({ ok: false, error: "Too many messages. Please wait a few minutes." });
  }

  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";

  // Honeypot: legitimate visitors leave this empty.
  if (website) return res.status(200).json({ ok: true });
  if (!NAME_RE.test(name) || name.length < 1 || name.length > 80 || message.length < 1 || message.length > 500) {
    return res.status(400).json({ ok: false, error: "Please enter a valid name and message." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ ok: false, error: "Guestbook is not configured." });

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/guestbook`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ name, message, approved: false }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Guestbook insert failed", response.status, detail.slice(0, 500));
      return res.status(502).json({ ok: false, error: "Unable to save your message right now." });
    }
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Guestbook API error", error);
    return res.status(500).json({ ok: false, error: "Unable to save your message right now." });
  }
}
