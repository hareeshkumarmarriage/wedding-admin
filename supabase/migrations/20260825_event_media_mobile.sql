-- Event media + public cover refresh migration
-- Run this once in Supabase SQL Editor if the existing project was created
-- before the latest schema.sql.

alter table public.events add column if not exists cover_image_drive_id text;
alter table public.events add column if not exists photos_drive_folder_id text;
alter table public.events add column if not exists videos_drive_folder_id text;

update public.events
set photos_drive_folder_id = coalesce(nullif(photos_drive_folder_id, ''), drive_folder_id),
    videos_drive_folder_id = coalesce(nullif(videos_drive_folder_id, ''), drive_folder_id)
where photos_drive_folder_id is null
   or photos_drive_folder_id = ''
   or videos_drive_folder_id is null
   or videos_drive_folder_id = '';

drop view if exists public.events_public;
create view public.events_public as
select id, slug, title, date, description, cover_image, cover_image_drive_id,
       drive_folder_id, photos_drive_folder_id, videos_drive_folder_id,
       sort_order, is_active, photos_enabled, videos_enabled, slideshow_enabled,
       qr_enabled, venue_name, venue_address, maps_url, updated_at
from public.events
where is_active = true;

grant select on public.events_public to anon, authenticated;
