# Security, Performance & Reliability Audit — Final Hardening

## Fixed in this build

- Removed recursive `profiles` RLS evaluation by keeping the self-profile SELECT policy independent and using a `SECURITY DEFINER` admin helper with row-security disabled for its internal lookup.
- Guestbook submissions now use a same-origin Vercel API with server-side validation, a honeypot, a short client cooldown, and per-IP rate limiting. Public direct INSERT access is removed from RLS.
- Guestbook responses use `return=minimal`, avoiding the RLS conflict caused by trying to return an unapproved row to an anonymous user.
- Analytics writes moved behind a rate-limited server endpoint; anonymous direct INSERT access is removed.
- Admin actions are recorded in `admin_audit_logs`.
- Successful event unlocks receive a short-lived signed `HttpOnly` cookie. The unlock secret is mandatory for production API routes.
- Google Drive file listing is proxied through `/api/drive` in production so the Drive API key can remain server-only. Local development has a browser-key fallback when the serverless function is unavailable.
- Gallery and video routes are code-split with React lazy loading.
- Gallery thumbnails use smaller responsive requests, lazy loading and asynchronous decoding.
- Full-resolution photo/video downloads are not buffered into browser Blobs.
- Drive listings remain paginated at 60 items per page with Load More controls.
- Service worker does not cache `/api/*` responses.
- Admin data continues to be protected by Supabase RLS.
- `VITE_*` secrets are avoided; only browser-safe values should use the Vite prefix.

## Remaining architectural limitation

If Google Drive files are publicly readable, a direct Drive URL can still be used outside the wedding website. The application/event code is therefore an application gate, not file-level authorization. For true private media, keep the Drive files private and use an authenticated media proxy/CDN with short-lived signed URLs and HTTP Range support.

## Verification

- Node syntax checks passed for all serverless API modules.
- TypeScript `tsc --noEmit` passed.
- Final ZIP excludes `node_modules` and development-only build artifacts.
