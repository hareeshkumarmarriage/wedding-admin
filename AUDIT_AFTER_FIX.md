# Complete Website Audit — After Fixes

Date: 2026-08-24
Project: hareeshkumar-wedding-admin-v12-control-center-complete

## Scope

Audited the complete uploaded ZIP, including:

- 158 project files (source, API, configuration, assets, documentation and tests)
- All 8 Vercel/API handlers
- React/TypeScript source files
- Local Vite API bridge
- Google Drive integration
- Supabase integration
- Event security/unlock flow
- Guest photo upload flow
- RSVP, guestbook and analytics endpoints
- Vercel security headers/configuration
- Package manifest and lockfile consistency
- Image assets
- Internal relative/@ imports

## Issues Found and Fixed

### 1. Guest upload API was CommonJS inside an ESM project

The project declares `"type": "module"`, but `api/guest-upload.js` used `require()` and `module.exports`.

**Fix:** converted the handler to native ESM (`import crypto` + `export default`).

### 2. Guest uploads were not server-side protected by the event security code

The browser event gate could be bypassed by calling `/api/guest-upload` directly.

**Fix:** the upload endpoint now requires the same short-lived signed `wedding_unlock` cookie used by the private gallery/video APIs. It also verifies the event is active and binds the unlock to the event's current `updated_at` code version.

### 3. Guest upload trusted the browser MIME type

A caller could claim an arbitrary file was JPEG/PNG/WebP while sending different bytes.

**Fix:** the API now checks the actual file signature (JPEG, PNG, WebP) before storing it.

### 4. Guest upload base64 input was not validated

Malformed base64 could be accepted and decoded unexpectedly.

**Fix:** added base64-format validation before decoding.

### 5. Google Drive media playback/download could fail in production

The browser-side video/image URL helpers relied on `VITE_GOOGLE_DRIVE_API_KEY` when a Drive thumbnail was unavailable. Production is designed to keep the Drive API key server-side, so videos without usable thumbnails could end up with an empty media URL.

**Fix:** use Drive's `webContentLink` when available before falling back to the browser API-key path. This keeps production media usable without requiring the API key in the browser for normal Drive responses.

### 6. Unlock endpoint accepted cross-origin requests

The event unlock endpoint did not apply the same-origin check used by the other write APIs.

**Fix:** added same-origin validation to `/api/unlock`.

## Security Checks

- No hard-coded Google API keys found.
- No Supabase service-role key found in source.
- No private-key blocks found.
- No obvious JWT credential found.
- No broken symlinks found.
- No zero-byte project files found.
- Security headers are configured in `vercel.json`.
- Service-role credentials are referenced only through server-side environment variables.
- Event media APIs validate the signed, expiring unlock cookie.

## Automated Verification

### Passed

- TypeScript compiler check: `tsc --noEmit`
- All API modules import successfully under Node ESM.
- All API handlers passed method/error smoke checks.
- Event unlock success/failure smoke tests passed.
- Guest upload rejects fake JPEG bytes.
- Guest upload accepts a valid signed JPEG payload in the smoke test.
- Guest upload rejects missing/invalid event unlock access.
- Drive API rejects missing unlock access and accepts a valid unlock cookie.
- Internal TypeScript/TSX import-path scan: passed.
- Image integrity verification: passed.
- `package.json` and `vercel.json` JSON validation: passed.
- `package.json` dependency counts match the lockfile root metadata.

### Build/Test limitation

The ZIP does not contain `node_modules`. A dependency installation was attempted, but the environment could not complete the npm dependency download. An offline install also failed because required packages were not present in the local npm cache.

Therefore:

- `tsc --noEmit` was successfully run using the available TypeScript compiler.
- `npm run build` could not be executed because the Vite binary was unavailable.
- `npm run test` could not be executed because Vitest was unavailable.
- No claim is made that a full browser-rendered production build was executed in this environment.

Run these after extracting the ZIP in a normal Node/npm environment:

```bash
npm ci
npm run lint
npm run test
npm run build
```

## Environment Variables Required for Production

Server-side:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EVENT_UNLOCK_SECRET`
- `GOOGLE_DRIVE_API_KEY`

Browser-safe/public:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_DRIVE_FOLDER_ID` only if the local/browser fallback is intentionally used
- `VITE_GOOGLE_DRIVE_API_KEY` only for the intentional local-development/browser fallback

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `EVENT_UNLOCK_SECRET` with a `VITE_` prefix.

## Result

The identified source/security issues were fixed and the project passed all checks that could be executed in the available environment.
