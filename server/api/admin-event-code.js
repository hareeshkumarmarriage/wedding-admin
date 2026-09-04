import crypto from "node:crypto";

const EVENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CODE_MIN = 6;
const CODE_MAX = 128;

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === String(req.headers.host || ""); } catch { return false; }
}

function hashCode(code) {
  return crypto.createHash("sha256").update(code.trim().toLowerCase(), "utf8").digest("hex");
}

function encryptionKey() {
  const secret = process.env.EVENT_UNLOCK_SECRET || "";
  return crypto.createHash("sha256").update(`wedding-admin-code:${secret}`, "utf8").digest();
}

function encryptCode(code) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function decryptCode(value) {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch { return null; }
}

async function authenticateAdmin(req, supabaseUrl, anonKey) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw Object.assign(new Error("Admin session is missing."), { status: 401 });
  const userResult = await supabaseFetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
  if (!userResult.response.ok || !userResult.body?.id) throw Object.assign(new Error("Invalid or expired admin session."), { status: 401 });
  const adminId = userResult.body.id;
  const profileResult = await supabaseFetch(`${supabaseUrl}/rest/v1/profiles?select=id,role&id=eq.${encodeURIComponent(adminId)}&role=eq.admin&limit=1`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
  if (!profileResult.response.ok || !Array.isArray(profileResult.body) || profileResult.body.length !== 1) throw Object.assign(new Error("Administrator access is required."), { status: 403 });
  return { token, adminId };
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

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Forbidden" });

  const body = req.body || {};
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) {
    return res.status(503).json({ ok: false, error: "Supabase server configuration is missing. Add SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)." });
  }

  try {
    const { token, adminId } = await authenticateAdmin(req, supabaseUrl, anonKey);

    if (req.method === "GET") {
      let eventResult = await supabaseFetch(`${supabaseUrl}/rest/v1/events?select=id,slug,title,secret_code_encrypted&order=sort_order.asc`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
      if (!eventResult.response.ok) {
        eventResult = await supabaseFetch(`${supabaseUrl}/rest/v1/events?select=id,slug,title&order=sort_order.asc`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
      }
      if (!eventResult.response.ok || !Array.isArray(eventResult.body)) return res.status(502).json({ ok: false, error: "Unable to load event security codes." });
      return res.status(200).json({ ok: true, events: eventResult.body.map((e) => ({ id: e.id, slug: e.slug, title: e.title, code: decryptCode(e.secret_code_encrypted) })) });
    }

    const eventId = typeof body.event_id === "string" ? body.event_id : "";
    const slug = typeof body.slug === "string" ? body.slug : "";
    const code = typeof body.code === "string" ? body.code : "";
    if (body.action !== "set_all" && (!eventId || !/^[0-9a-f-]{36}$/i.test(eventId) || !EVENT_RE.test(slug))) {
      return res.status(400).json({ ok: false, error: "Invalid event." });
    }
    if (code.trim().length < CODE_MIN || code.trim().length > CODE_MAX) {
      return res.status(400).json({ ok: false, error: `Security code must be ${CODE_MIN}-${CODE_MAX} characters.` });
    }

    if (body.action === "set_all") {
      const allCode = typeof body.code === "string" ? body.code : "";
      if (allCode.trim().length < CODE_MIN || allCode.trim().length > CODE_MAX) return res.status(400).json({ ok: false, error: `Security code must be ${CODE_MIN}-${CODE_MAX} characters.` });
      const allEventsResult = await supabaseFetch(`${supabaseUrl}/rest/v1/events?select=id,slug&is_active=eq.true`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
      if (!allEventsResult.response.ok || !Array.isArray(allEventsResult.body)) return res.status(502).json({ ok: false, error: "Unable to load events." });
      const patch = { secret_code_hash: hashCode(allCode), secret_code_encrypted: encryptCode(allCode), updated_at: new Date().toISOString() };
      for (const ev of allEventsResult.body) {
        let r = await supabaseFetch(`${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(ev.id)}`, { method: "PATCH", headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(patch) });
        if (!r.response.ok) {
          r = await supabaseFetch(`${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(ev.id)}`, { method: "PATCH", headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ secret_code_hash: hashCode(allCode), updated_at: new Date().toISOString() }) });
        }
        if (!r.response.ok) return res.status(502).json({ ok: false, error: `Unable to change the security code for ${ev.slug}.` });
      }
      const auditResult = await supabaseFetch(`${supabaseUrl}/rest/v1/admin_audit_logs`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ admin_id: adminId, action: "change_all_event_codes", target_id: null, details: { event_count: allEventsResult.body.length } }) });
      if (!auditResult.response.ok) console.error("Bulk event code audit failed", auditResult.response.status);
      return res.status(200).json({ ok: true, message: `Security code changed for ${allEventsResult.body.length} events.`, count: allEventsResult.body.length });
    }

    const eventResult = await supabaseFetch(
      `${supabaseUrl}/rest/v1/events?select=id,slug&id=eq.${encodeURIComponent(eventId)}&limit=1`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } },
    );
    if (!eventResult.response.ok || !Array.isArray(eventResult.body) || eventResult.body[0]?.slug !== slug) {
      return res.status(404).json({ ok: false, error: "Event not found." });
    }

    let updateResult = await supabaseFetch(
      `${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ secret_code_hash: hashCode(code), secret_code_encrypted: encryptCode(code), updated_at: new Date().toISOString() }),
      },
    );
    if (!updateResult.response.ok) {
      updateResult = await supabaseFetch(`${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}`, { method: "PATCH", headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ secret_code_hash: hashCode(code), updated_at: new Date().toISOString() }) });
    }
    if (!updateResult.response.ok) {
      console.error("Event code update failed", updateResult.response.status, String(updateResult.body).slice(0, 500));
      return res.status(502).json({ ok: false, error: "Unable to change the security code." });
    }

    const auditResult = await supabaseFetch(`${supabaseUrl}/rest/v1/admin_audit_logs`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ admin_id: adminId, action: "change_event_code", target_id: eventId, details: { slug } }),
    });
    if (!auditResult.response.ok) console.error("Event code audit failed", auditResult.response.status);

    return res.status(200).json({ ok: true, message: "Security code changed successfully." });
  } catch (error) {
    const status = Number(error?.status);
    if (status === 401 || status === 403) {
      return res.status(status).json({ ok: false, error: error.message || "Administrator access is required." });
    }
    console.error("Admin event code API error", error);
    return res.status(500).json({ ok: false, error: "Unable to change the security code." });
  }
}
