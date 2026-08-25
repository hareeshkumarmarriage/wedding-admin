export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Method not allowed" });
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const unlockSecret = process.env.EVENT_UNLOCK_SECRET || serviceKey || "";
  return res.status(200).json({
    ok: true,
    supabase: Boolean(supabaseUrl && anonKey),
    mediaDatabase: Boolean(supabaseUrl && serviceKey),
    unlockSigning: Boolean(unlockSecret),
    configured: Boolean(supabaseUrl && serviceKey && unlockSecret),
    missing: [!supabaseUrl ? "SUPABASE_URL" : "", !anonKey ? "SUPABASE_ANON_KEY" : "", !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : "", !unlockSecret ? "EVENT_UNLOCK_SECRET" : ""].filter(Boolean),
  });
}
