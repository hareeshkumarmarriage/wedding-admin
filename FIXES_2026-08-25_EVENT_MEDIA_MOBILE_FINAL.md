# Events dashboard — final media and mobile optimization

## Changes
- Admin > Events keeps separate Google Drive folder IDs for Photos and Videos.
- Added **Open Photos Folder in Drive** and **Open Videos Folder in Drive** buttons for every existing event and for new event creation.
- Coverage image continues to use a Google Drive file ID and Check & Preview.
- Public event cards now cache-bust Drive cover URLs using the event `updated_at` value, so replacing/updating a cover is reflected without waiting for an old image cache.
- Added a direct Google Drive thumbnail fallback if the same-origin media proxy cannot render a cover.
- Added `updated_at` to the public `events_public` view.
- Event dashboard cards are more compact and responsive on phones: single-column at smaller widths, full-width inputs, smaller headings, and mobile-friendly Drive actions.
- Added a Supabase migration for existing projects.

## Database
If the existing Supabase database already contains the media columns, run:
`supabase/migrations/20260825_event_media_mobile.sql`

Alternatively, run the current `supabase/schema.sql`.

## Validation
- Source-level consistency checked for event media fields and public cover flow.
- Attempted `npm ci` for a full build/lint test, but dependency installation timed out in the execution environment. No application build result is claimed from that attempt.
