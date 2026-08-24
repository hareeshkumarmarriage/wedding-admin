# Admin + Homepage Fix Audit — 24 Aug 2026

## Fixed
- Admin save/action buttons explicitly use `type="button"` to prevent accidental form submission behavior.
- Backspace is prevented from triggering browser history navigation when focus is outside an editable control.
- Enter on admin `<summary>` elements no longer accidentally collapses a Content section.
- Content section open/closed state is controlled and preserved across data reloads.
- Save/action operations preserve the current scroll position after the admin data refresh.
- Success/error/info messages are displayed in a sticky alert area near the top of the Control Center.
- Save actions now report success only after the action completes; reload failures are reported separately.
- Drive image URLs now have multiple public-compatible fallbacks.
- Groom and bride images automatically try alternate Drive URLs before falling back to bundled images.
- Intro video now tries multiple Drive media URLs when the first URL fails.
- Intro settings for autoplay, mute, and skip are now respected.
- All Admin buttons were checked for explicit button type.

## Verification performed
- All 8 API JavaScript handlers passed `node --check`.
- All `@/` and relative TypeScript import paths resolve to existing files.
- No zero-byte source/assets were introduced.
- The source tree was scanned for obvious VITE secret/service-key exposure patterns; only the expected public Google Drive API key and Supabase anonymous key remain.
- Full Vite build could not be completed because the uploaded ZIP's `node_modules` was incomplete and package installation could not finish in this environment.
- The project should be run locally with `npm ci`, then `npm run build`, `npm run lint`, and `npm test` before production deployment.

## Google Drive requirement
For browser-visible Drive images/videos, the corresponding Drive files must be shared so the public wedding site can access them. A Drive file ID alone does not grant access to a private file.
