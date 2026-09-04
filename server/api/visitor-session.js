import crypto from "node:crypto";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const COOKIE = "wedding_visitor_token";

function json(res, status, body) {
  return res.status(status).setHeader("Content-Type", "application/json").end(JSON.stringify(body));
}

function info(req) {
  const ua = String(req.headers["user-agent"] || "Unknown");
  const os = /android/i.test(ua) ? "Android" : /iphone|ipad|ipod/i.test(ua) ? "iOS" : /windows/i.test(ua) ? "Windows" : /mac/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
  const browser = /edg\//i.test(ua) ? "Edge" : /chrome\//i.test(ua) ? "Chrome" : /firefox\//i.test(ua) ? "Firefox" : /safari\//i.test(ua) ? "Safari" : "Browser";
  return {
    ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim(),
    device: `${os} · ${browser}`,
    ua,
  };
}

function cookie(req, name) {
  const raw = String(req.headers.cookie || "");
  const match = raw.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function token() {
  return crypto.randomBytes(32).toString("base64url");
}

function secureFlag(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  const host = String(req.headers.host || "").toLowerCase();
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  return (proto === "https" || (!proto && req.socket?.encrypted)) && !local ? "; Secure" : "";
}

async function isAdmin(req) {
  const tokenValue = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!tokenValue || !SUPABASE_URL || !SERVICE) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${tokenValue}` },
  });
  if (!response.ok) return false;
  const user = await response.json();
  if (!user?.id) return false;
  const profile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  if (!profile.ok) return false;
  const rows = await profile.json();
  return rows[0]?.role === "admin";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "POST required." });
    if (!SUPABASE_URL || !SERVICE) return json(res, 503, { ok: false, error: "Visitor tracking is not configured." });

    const body = req.body || {};
    const action = String(body.action || "");
    const adminHeaders = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

    if (action === "block") {
      if (!(await isAdmin(req))) return json(res, 401, { ok: false, error: "Admin authorization required." });
      const id = String(body.id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { ok: false, error: "Visitor ID is required." });
      const response = await fetch(`${SUPABASE_URL}/rest/v1/visitor_sessions?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...adminHeaders, Prefer: "return=representation" },
        body: JSON.stringify({ blocked: Boolean(body.blocked) }),
      });
      const text = await response.text();
      if (!response.ok) return json(res, response.status, { ok: false, error: text });
      return json(res, 200, { ok: true });
    }

    const deviceId = String(body.device_id || "");
    const visitorName = String(body.visitor_name || "").trim();
    if (!/^[A-Za-z0-9._:-]{8,120}$/.test(deviceId)) return json(res, 400, { ok: false, error: "Invalid device ID." });
    if (!visitorName) return json(res, 400, { ok: false, error: "Name is required." });

    const existing = await fetch(`${SUPABASE_URL}/rest/v1/visitor_sessions?device_id=eq.${encodeURIComponent(deviceId)}&select=id,blocked&limit=1`, {
      headers: adminHeaders,
    }).then((response) => response.ok ? response.json() : []);
    if (existing?.[0]?.blocked) return json(res, 200, { ok: true, blocked: true });

    const existingToken = cookie(req, COOKIE);
    const visitorToken = existingToken || token();
    const i = info(req);
    const payload = {
      device_id: deviceId,
      visitor_name: visitorName.slice(0, 80),
      role: "visitor",
      ip_address: i.ip,
      device: i.device,
      user_agent: i.ua,
      last_seen_at: new Date().toISOString(),
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/visitor_sessions?on_conflict=device_id`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) return json(res, response.status, { ok: false, error: text });

    if (!existingToken) {
      res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(visitorToken)}; Path=/; Max-Age=31536000; HttpOnly${secureFlag(req)}; SameSite=Lax`);
    }
    return json(res, 200, { ok: true, blocked: false });
  } catch (error) {
    return json(res, 500, { ok: false, error: error?.message || "Visitor session failed." });
  }
}
