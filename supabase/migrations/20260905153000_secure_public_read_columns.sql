-- Public clients must use the curated *_public views. Base tables contain admin-only
-- and security-sensitive fields, so anonymous access is limited to safe columns/rows.

alter view public.events_public set (security_invoker = true);
alter view public.homepage_sections_public set (security_invoker = true);
alter view public.notifications_public set (security_invoker = true);
alter view public.site_settings_public set (security_invoker = true);

revoke select on public.events from anon;
grant select (id, slug, title, date, description, cover_image, cover_image_drive_id,
  drive_folder_id, photos_drive_folder_id, photos_drive_folder_id_2,
  videos_drive_folder_id, videos_drive_folder_id_2, sort_order, is_active,
  photos_enabled, videos_enabled, slideshow_enabled, qr_enabled,
  venue_name, venue_address, maps_url, updated_at) on public.events to anon;
drop policy if exists "public can read active events" on public.events;
create policy "public can read active events safe columns"
on public.events for select to anon using (is_active = true);

revoke select on public.homepage_sections from anon;
grant select (key, label, enabled, sort_order, updated_at) on public.homepage_sections to anon;
drop policy if exists "public can read homepage sections" on public.homepage_sections;
create policy "public can read homepage sections safe"
on public.homepage_sections for select to anon using (true);

revoke select on public.site_settings from anon;
grant select (key, value) on public.site_settings to anon;
drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read public site settings"
on public.site_settings for select to anon
using (key = any (array['wedding','theme','siteControl']));

revoke select on public.notifications from anon;
grant select (id, type, title, message, target, created_at) on public.notifications to anon;
drop policy if exists "public can read public notifications" on public.notifications;
create policy "public can read public notifications safe"
on public.notifications for select to anon
using (coalesce(target, 'public') = any (array['public','landing','all']));

grant select on public.events_public to anon, authenticated;
grant select on public.homepage_sections_public to anon, authenticated;
grant select on public.notifications_public to anon, authenticated;
grant select on public.site_settings_public to anon, authenticated;
