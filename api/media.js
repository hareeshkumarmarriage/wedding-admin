const ID_RE = /^[A-Za-z0-9_-]{10,}$/;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const id = String(req.query?.id || "").trim();
  if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Invalid Drive file ID" });

  const driveKey = process.env.GOOGLE_DRIVE_API_KEY || "";
  if (!driveKey) return res.status(503).json({ ok: false, error: "Google Drive media service is not configured" });

  try {
    const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`);
    url.searchParams.set("alt", "media");
    url.searchParams.set("key", driveKey);

    const headers = {};
    const range = req.headers.range;
    if (typeof range === "string" && range) headers.Range = range;

    const response = await fetch(url, { method: req.method, headers });

    if (!response.ok) {
      const message = response.status === 404 || response.status === 403
        ? "Google Drive file is not accessible. Make sure the file is shared for public website access."
        : "Unable to load Google Drive media.";
      return res.status(response.status === 404 ? 404 : response.status === 403 ? 403 : 502).json({ ok: false, error: message });
    }

    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");
    const etag = response.headers.get("etag");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
    if (etag) res.setHeader("ETag", etag);

    res.status(response.status);
    if (req.method === "HEAD" || !response.body) return res.end();

    const { Readable } = await import("node:stream");
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error("Drive media proxy error", error);
    return res.status(502).json({ ok: false, error: "Unable to load Google Drive media." });
  }
}
