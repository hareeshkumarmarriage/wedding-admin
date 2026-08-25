# Hareesh & Prasanna Wedding Website

## Stack
- Vite + React + TypeScript
- Vercel serverless `/api/unlock`
- Google Drive for media
- Supabase for events, guestbook, analytics and admin authentication

## Setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Set `VITE_GOOGLE_DRIVE_API_KEY` and `VITE_GOOGLE_DRIVE_FOLDER_ID` only if you intentionally use the browser-side Drive API. The Drive API key is **not a secret**; restrict it in Google Cloud by API, HTTP referrer, and quota.
4. Run `supabase/schema.sql`.
5. In Vercel set these **server-only** variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EVENT_UNLOCK_SECRET`
   - `GOOGLE_DRIVE_API_KEY` (recommended for a future server-side media proxy)
6. Create a Supabase Auth admin user and add its ID to `public.profiles` with `role='admin'`.

## Security notes

- The browser never receives the Supabase service-role key.
- Event unlock verification is server-side, uses constant-time hash comparison, has basic per-IP rate limiting, and sends `Cache-Control: no-store`.
- The old development-only hard-coded bypass has been removed.
- Do **not** treat `sessionStorage` as authentication. It only remembers that this browser has unlocked an event for 30 minutes.
- If Google Drive media is publicly readable, the event code is only an application gate, not true file-level access control. For real privacy, keep the Drive files non-public and serve media through a server-side authenticated/proxied endpoint.
- Anonymous Supabase favorites were deliberately removed from the public RLS path because a browser-supplied visitor ID cannot be trusted as an identity. The UI still works with local favorites.
- Never commit `.env`, service-role keys, or other secrets.

## Performance

- Drive thumbnails are resized for grid/lightbox use instead of requesting the original image where a thumbnail is available.
- Gallery images use native lazy loading for items outside the initial viewport.
- For thousands of media files, the next improvement should be cursor-based Drive pagination with a Load More/infinite-scroll UI and a server-side media proxy.

## Admin

Open `/admin` and authenticate with Supabase Auth. Admin RLS is enforced in Supabase; the browser token is stored only for the current tab session.

## Important migration

The previous code used a `guestbook_messages` table with a `status` column, but the supplied SQL actually defines `public.guestbook` with an `approved` boolean. The application has been corrected to use the SQL schema (`guestbook` + `approved`).

The SQL seed still contains the existing event-code hash for compatibility. Rotate the event code before production if that code has ever been exposed or reused elsewhere.


## Audit hardening added

- Google Drive listings are paginated at 60 items per request instead of requesting up to 1,000 files at once.
- Photo and video pages now expose **Load More** controls, preventing thousands of cards from being fetched/rendered initially.
- Gallery thumbnails use smaller responsive requests; the thumbnail URL resizing bug was corrected.
- Photo/video downloads no longer buffer the complete media file into a browser Blob. The browser is allowed to stream/open the Drive media URL instead.
- Drive page responses are cached per page with a short TTL.
- TypeScript, Node syntax checks and the production type graph were revalidated after the changes.

## Production hardening in this version

- Guestbook writes go through `/api/guestbook`, with same-origin checks, a honeypot, server-side validation and per-IP rate limiting. Anonymous direct INSERT access to `guestbook` is intentionally removed.
- Analytics writes go through `/api/analytics` with validation and rate limiting. Anonymous direct INSERT access to `gallery_views` is removed.
- Successful event unlocks issue a short-lived, `HttpOnly`, `Secure`, `SameSite=Lax` cookie signed with `EVENT_UNLOCK_SECRET`.
- Google Drive listing is proxied through `/api/drive` in production, so the Drive API key can remain server-only. Local Vite development can still fall back to `VITE_GOOGLE_DRIVE_API_KEY` when the Vercel function is unavailable.
- Admin actions are recorded in `admin_audit_logs`.
- Admin, gallery and video routes are code-split with React lazy loading.
- The service worker caches the application shell but never caches `/api/*` responses.

### Required Vercel server variables

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EVENT_UNLOCK_SECRET`, and `GOOGLE_DRIVE_API_KEY` are required for production API routes. `EVENT_UNLOCK_SECRET` should be a long random value and must not be exposed through any `VITE_*` variable.

### Media privacy limitation

The server-side Drive listing protects enumeration of event media after unlock, but if the underlying Google Drive files are publicly readable, a person who obtains a direct Google/Drive media URL may still access that file outside the site. For true private-media access control, keep Drive files private and use a dedicated authenticated media proxy/CDN with short-lived signed URLs and HTTP Range support.


## Wedding Management Dashboard V2

Run the latest `supabase/schema.sql` once in Supabase SQL Editor. The migration is additive and does **not** overwrite existing event security-code hashes.

### Local development with API routes

Because event unlocking, RSVP submission, analytics and guest uploads use `/api/*` server routes, use:

```bash
vercel dev
```

instead of only `npm run dev` when testing those features locally.

Required server-side variables for the API routes:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EVENT_UNLOCK_SECRET`
- `GOOGLE_DRIVE_API_KEY`

The event security code is never stored in the browser. Existing event codes remain unchanged unless an administrator explicitly uses **Change code**.

### New dashboard areas

Dashboard, Guests, RSVP, Guestbook moderation, Gallery/QR links, Events, Website Content, Homepage section ordering, Analytics, Notifications, CSV Exports, Security and Audit Log.

Guest photo uploads are available at `/upload?event=<event-slug>` and use the private `wedding-guest-uploads` Supabase Storage bucket.

## Event security code display and bulk change
- Admin can see the current code only after it has been securely encrypted and stored by the updated admin code API.
- Existing legacy events contain only a one-way SHA-256 hash, so their old plaintext code cannot be recovered. Set a new code once to enable secure display.
- Security Center includes a separate "Change all event codes" action for all active events.
- Event unlock requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `EVENT_UNLOCK_SECRET`. If `EVENT_UNLOCK_SECRET` is omitted, the server derives the signing secret from the service-role key as a fallback; setting a dedicated random `EVENT_UNLOCK_SECRET` is still recommended.


## Final Supabase repair migration

After deploying this build, run `supabase/migrations/20260825_audit_and_sessions_repair.sql` in Supabase SQL Editor. It repairs the audit action constraint and policies, ensures admin/visitor session tables and public notifications view exist, and makes the Audit Log readable to admins.


## Production security requirements

- Set `EVENT_UNLOCK_SECRET` to a long random server-only secret. It is required for event unlock signing/encryption.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `GOOGLE_DRIVE_API_KEY` through `VITE_` variables.
- Run `npm run test:all` before production deploys.
- Run the latest `supabase/schema.sql` migration after deploying this version.
- Favorites are intentionally local-only until a server-issued visitor identity is enabled.
