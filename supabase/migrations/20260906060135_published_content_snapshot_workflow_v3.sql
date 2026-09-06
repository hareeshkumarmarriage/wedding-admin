-- Draft/publish boundary for public content.
-- Applied in production as migration 20260906060135.
create table if not exists public.admin_published_snapshot (
  id boolean primary key default true check (id = true),
  snapshot jsonb not null default '{}'::jsonb,
  revision_id uuid references public.admin_revisions(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_published_snapshot enable row level security;
revoke all on public.admin_published_snapshot from anon, authenticated;

insert into public.admin_published_snapshot (id, snapshot, updated_at)
select true,
  jsonb_build_object(
    'schema', 1,
    'created_at', now(),
    'site_settings', coalesce((select jsonb_agg(to_jsonb(s) order by s.key) from public.site_settings s), '[]'::jsonb),
    'homepage_sections', coalesce((select jsonb_agg(to_jsonb(h) order by h.sort_order) from public.homepage_sections h), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.sort_order) from public.events e), '[]'::jsonb)
  ), now()
where not exists (select 1 from public.admin_published_snapshot);

create or replace view public.site_settings_public as
select x.key, x.value from public.admin_published_snapshot p
cross join lateral jsonb_to_recordset(coalesce(p.snapshot->'site_settings','[]'::jsonb)) as x(key text, value jsonb)
where x.key in ('wedding', 'theme', 'siteControl');

drop view if exists public.homepage_sections_public;
create view public.homepage_sections_public as
select x.key, x.label, x.enabled, x.sort_order, x.updated_at from public.admin_published_snapshot p
cross join lateral jsonb_to_recordset(coalesce(p.snapshot->'homepage_sections','[]'::jsonb)) as x(key text, label text, enabled boolean, sort_order integer, updated_at timestamptz)
order by x.sort_order asc;

drop view if exists public.events_public;
create view public.events_public as
select x.id, x.slug, x.title, x.date, x.description, x.cover_image, x.cover_image_drive_id,
       x.drive_folder_id, x.photos_drive_folder_id, x.photos_drive_folder_id_2,
       x.videos_drive_folder_id, x.videos_drive_folder_id_2, x.sort_order,
       x.is_active, x.photos_enabled, x.videos_enabled, x.slideshow_enabled, x.qr_enabled,
       x.venue_name, x.venue_address, x.maps_url, x.created_at, x.updated_at
from public.admin_published_snapshot p
cross join lateral jsonb_to_recordset(coalesce(p.snapshot->'events','[]'::json)) as x(
  id uuid, slug text, title text, date date, description text, cover_image text,
  cover_image_drive_id text, drive_folder_id text, photos_drive_folder_id text,
  photos_drive_folder_id_2 text, videos_drive_folder_id text, videos_drive_folder_id_2 text,
  sort_order integer, is_active boolean, photos_enabled boolean, videos_enabled boolean,
  slideshow_enabled boolean, qr_enabled boolean, venue_name text, venue_address text,
  maps_url text, created_at timestamptz, updated_at timestamptz
)
order by x.sort_order asc;

grant select on public.site_settings_public to anon, authenticated;
grant select on public.homepage_sections_public to anon, authenticated;
grant select on public.events_public to anon, authenticated;
