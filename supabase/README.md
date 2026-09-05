# Supabase database

The SQL files under `supabase/migrations/` are the source of truth for this project.

Do not maintain a second hand-written schema snapshot: it can drift from the live Supabase project and accidentally recreate removed legacy tables or outdated security policies.

The production project is currently aligned through the migrations already applied in Supabase. New database changes must be added as a new timestamped migration and applied through Supabase migrations.

## Important security boundaries

- `events`, `site_settings`, guest/admin data and analytics are protected by RLS and/or server-only service-role access.
- Public website data is exposed through the `*_public` views where appropriate.
- Event security hashes and encrypted codes are never exposed through `events_public`.
- Guest uploads use the private `wedding-guest-uploads` bucket and the server upload API.
- Rate-limit state is stored in the private `private.rate_limits` table and accessed only through the service-role-only `public.consume_rate_limit()` function.
- Legacy `guestbook_messages` and `favorites` tables were removed because the application no longer uses them.
