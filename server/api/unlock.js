import { durableRateLimit } from "./rateLimit.js";
import crypto from "node:crypto";

const attempts = new Map();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const EVENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest();
}

function safeEqualHex(a, b) {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || req.socket?.remoteAddress || "unknown").split(",")[0].trim();

  if (rateLimit(ip) || !(await durableRateLimit(`unlock:${ip}`, 60, 10))) {
    return res.status(429).json({ ok: false, error: "Too many attempts. Please wait a minute and try again." });
  }

  const { event, code } = req.body || {};
  if (
    typeof event !== "string" ||
    !EVENT_RE.test(event) ||
    typeof code !== "string" ||
    code.length === 0 ||
    code.length > 128
  ) {
    return res.status(400).json({ ok: false, error: "Invalid request" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const unlockSecret = process.env.EVENT_UNLOCK_SECRET || "";
  if (!supabaseUrl || !serviceKey || !unlockSecret) {
    const missing = [!supabaseUrl ? "SUPABASE_URL" : "", !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : "", !unlockSecret ? "EVENT_UNLOCK_SECRET" : ""].filter(Boolean);
    return res.status(503).json({ ok: false, error: `Event security is not configured. Missing: ${missing.join(", ")}.` });
  }

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/events?select=secret_code_hash,updated_at&slug=eq.${encodeURIComponent(event)}&is_active=eq.true&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: "Unable to verify the security code." });
    }

    const rows = await response.json();
    const expected = rows[0]?.secret_code_hash;
    const codeVersion = rows[0]?.updated_at || "";
    const supplied = sha256(code.trim().toLowerCase()).toString("hex");

    if (!safeEqualHex(supplied, expected || "")) {
      return res.status(401).json({ ok: false, error: "Incorrect security code." });
    }

    const payload = Buffer.from(JSON.stringify({ event, codeVersion, exp: Date.now() + 30 * 60 * 1000 }), "utf8").toString("base64url");
    const signature = crypto.createHmac("sha256", unlockSecret).update(payload).digest("base64url");
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
    const host = String(req.headers.host || "").toLowerCase();
    const isLocal = host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:") || host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    const isHttps = forwardedProto === "https" || (!forwardedProto && req.socket?.encrypted);
    const secureFlag = isHttps && !isLocal ? "; Secure" : "";
    res.setHeader("Set-Cookie", `wedding_unlock=${encodeURIComponent(`${payload}.${signature}`)}; Path=/; Max-Age=1800; HttpOnly${secureFlag}; SameSite=Lax`);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Unable to verify the security code." });
  }
}
