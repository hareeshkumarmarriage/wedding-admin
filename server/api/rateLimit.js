const URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export async function durableRateLimit(key, windowSeconds, max) {
  if (!URL || !KEY) return true;
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/consume_rate_limit`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_key: key, p_window_seconds: windowSeconds, p_max: max }) });
    if (!r.ok) return true;
    const value = await r.json();
    return value === true;
  } catch { return true; }
}
export function requestIp(req) { return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim(); }
