async function isAdmin(req, supabaseUrl, serviceKey) {
  const auth = String(req.headers.authorization || "");
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const userResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return false;
  const user = await userResponse.json();
  if (!user?.id) return false;
  const profileResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!profileResponse.ok) return false;
  const rows = await profileResponse.json();
  return rows[0]?.role === "admin";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const fileId = String(req.query?.fileId || "").trim();
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return res.status(400).json({ ok: false, error: "Invalid Google Drive file ID" });

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY || "";
  if (!supabaseUrl || !serviceKey || !driveKey) return res.status(503).json({ ok: false, error: "Media service is not configured" });

  try {
    if (!(await isAdmin(req, supabaseUrl, serviceKey))) return res.status(401).json({ ok: false, error: "Administrator access required" });
    const params = new URLSearchParams({
      key: driveKey,
      fields: "id,name,mimeType,size,thumbnailLink,webViewLink,resourceKey,imageMediaMetadata(width,height)",
    });
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 404 ? 404 : 502).json({ ok: false, error: body?.error?.message || "Google Drive file was not found or is not accessible" });
    if (!String(body.mimeType || "").startsWith("image/")) return res.status(422).json({ ok: false, error: "The selected Google Drive file is not an image" });
    return res.status(200).json({
      ok: true,
      file: {
        id: body.id,
        name: body.name,
        mimeType: body.mimeType,
        size: body.size || null,
        thumbnailLink: body.thumbnailLink || null,
        webViewLink: body.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(body.id)}/view`,
        resourceKey: body.resourceKey || null,
        width: body.imageMediaMetadata?.width || null,
        height: body.imageMediaMetadata?.height || null,
      },
    });
  } catch (error) {
    console.error("Drive file validation error", error);
    return res.status(500).json({ ok: false, error: "Unable to validate Google Drive image" });
  }
}
