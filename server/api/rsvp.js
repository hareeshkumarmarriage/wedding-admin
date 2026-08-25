const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getIp(req) {
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
  if (limited(getIp(req))) return res.status(429).json({ ok: false, error: "Too many RSVP submissions. Please wait a few minutes." });

  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const attending = body.attending === true;
  const guestCount = Number.isInteger(body.guest_count) ? body.guest_count : Number(body.guest_count || 0);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (name.length < 1 || name.length > 100 || guestCount < 0 || guestCount > 20 || message.length > 500) {
    return res.status(400).json({ ok: false, error: "Please check the RSVP details." });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ ok: false, error: "RSVP service is not configured." });

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rsvps`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ name, email: email || null, phone: phone || null, attending, guest_count: attending ? Math.max(1, guestCount) : 0, message }),
    });
    if (!response.ok) return res.status(502).json({ ok: false, error: "Unable to save your RSVP right now." });
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Unable to save your RSVP right now." });
  }
}
