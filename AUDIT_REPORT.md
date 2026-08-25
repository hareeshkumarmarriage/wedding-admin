# Production Audit & Fix Report — 2026-08-25

## Implemented fixes

1. Protected unpublished `siteDraft` from public Supabase reads.
2. Protected `siteHistory` from public Supabase reads.
3. Added last-admin deletion protection.
4. Added last-admin demotion protection.
5. Prevented an admin from deleting/demoting their own active account.
6. Enforced 8-character minimum on admin password updates.
7. Made favorites local-only until a server-issued visitor identity is used, removing the broken anonymous RLS sync.
8. Replaced notification `prompt()` with a proper modal.
9. Replaced browser `confirm()` dialogs in the admin flow with confirmation dialogs.
10. Added actual guest-upload MIME/signature validation for JPEG/PNG/WebP.
11. Verified guest upload event slugs against active events.
12. Added server-issued HttpOnly visitor session cookies.
13. Added visitor IP hashing and token tracking.
14. Added durable Supabase-backed rate limiting for RSVP, guestbook, analytics, uploads and event unlock.
15. Made `EVENT_UNLOCK_SECRET` mandatory; removed service-role-key fallback for signing/encryption.
16. Tightened YouTube URL validation and always produces `youtube-nocookie.com` embeds.
17. Added strict Google Maps URL validation.
18. Restricted `/api/media` to published homepage/event media and event folders.
19. Removed browser-side Google Drive API-key fallback from production media loading.
20. Added `.env.example` with server/public variable separation.
21. Added canonical/OG metadata without hard-coding an unknown production domain.
22. Implemented landing mode to show only hero/events/footer on the homepage.
23. Added automated Vitest security coverage for YouTube URL validation.
24. Added Playwright homepage/admin smoke tests.
25. Added `typecheck` and `test:all` package scripts.
26. Updated README with production security requirements.
27. Added rate-limit SQL function/table and visitor token columns to `supabase/schema.sql`.
28. Fixed the audit-log action constraint so all currently used actions are accepted.
29. Added safe URL handling for invalid stored content values.
30. Added local draft preview storage so unpublished drafts do not need public database access.

## Static verification

- TypeScript/TSX syntax transpilation: **PASS**
- Server/API JavaScript syntax (`node --check`): **PASS**
- Local import path audit: **PASS — no missing local imports**
- Browser `prompt()` usage: **0**
- Browser `confirm()` usage: **0**
- `VITE_SUPABASE_SERVICE_ROLE_KEY`: **0**
- Dedicated event unlock secret required: **PASS**
- New test/config files present: **PASS**

## Build verification limitation

A full `npm ci` could not complete in the execution environment because registry access timed out. An offline retry also failed because required packages were not cached. Therefore a real `vite build`, ESLint run, Vitest run, and Playwright browser run could not be executed here.

Run these after extracting the ZIP in an environment with npm registry access:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

For the browser smoke tests:

```bash
npx playwright install
npx playwright test
```

## Supabase action required

Apply the updated `supabase/schema.sql` in the Supabase SQL Editor before deploying. It contains the new public-settings view, visitor-token columns, durable rate-limit function/table, and corrected audit constraint.

## Environment requirement

Set a strong random server-only:

```text
EVENT_UNLOCK_SECRET
```

Do not expose server secrets through `VITE_` variables.
