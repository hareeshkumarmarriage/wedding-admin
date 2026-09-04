-- Keep public views least-privilege and make their row visibility obey
-- the underlying table RLS policies.

alter view if exists public.events_public set (security_invoker = true);
alter view if exists public.notifications_public set (security_invoker = true);
alter view if exists public.site_settings_public set (security_invoker = true);
alter view if exists public.homepage_sections_public set (security_invoker = true);

-- Anonymous clients only need the columns exposed by the public views.
revoke all on table public.events from anon;
grant select (id, slug, title, description, event_date, event_time, location, location_url, cover_drive_id, photo_folder_id, video_folder_id, sort_order, is_active, created_at, updated_at) on table public.events to anon;

drop policy if exists "public can read active events" on public.events;
create policy "public can read active events"
on public.events
for select
to anon
using (is_active = true);

revoke all on table public.notifications from anon;
grant select (id, title, message, type, target, is_active, created_at, expires_at) on table public.notifications to anon;

drop policy if exists "public can read public notifications" on public.notifications;
create policy "public can read public notifications"
on public.notifications
for select
to anon
using (is_active = true and (target is null or lower(target) in ('public', 'landing', 'all')) and (expires_at is null or expires_at > now()));

revoke all on table public.site_settings from anon;
grant select (key, value) on table public.site_settings to anon;

revoke all on table public.homepage_sections from anon;
grant select (id, section_key, title, subtitle, description, enabled, sort_order, config, created_at, updated_at) on table public.homepage_sections to anon;

-- Favorites are written through the authenticated application flow. Keep RLS
-- enabled and permit users to manage only their own rows when user_id exists.
revoke all on table public.favorites from anon;
