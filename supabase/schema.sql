-- Wedding Website Supabase schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  date date,
  description text not null default '',
  cover_image text,
  cover_image_drive_id text,
  drive_folder_id text not null,
  photos_drive_folder_id text,
  photos_drive_folder_id_2 text,
  videos_drive_folder_id text,
  videos_drive_folder_id_2 text,
  secret_code_hash text not null,
  secret_code_encrypted text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  photos_enabled boolean not null default true,
  videos_enabled boolean not null default true,
  slideshow_enabled boolean not null default true,
  qr_enabled boolean not null default true,
  venue_name text,
  venue_address text,
  maps_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'guest' check (role in ('admin','guest')),
  created_at timestamptz not null default now()
);

-- Security-definer helper used by admin RLS policies.
-- `row_security = off` is important here: the function must inspect the
-- profiles table without re-entering the profiles RLS policies, otherwise
-- PostgreSQL can report: "infinite recursion detected in policy for relation profiles".
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.guestbook (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  message text not null check (char_length(message) between 1 and 500),
  event_id uuid references public.events(id) on delete set null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  event_id uuid references public.events(id) on delete cascade,
  photo_id text not null,
  created_at timestamptz not null default now(),
  unique(visitor_id, event_id, photo_id)
);

create table if not exists public.gallery_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id text check (visitor_id is null or char_length(visitor_id) <= 100),
  event_id uuid references public.events(id) on delete set null,
  media_type text not null check (media_type in ('event_view','photo_open','video_open')),
  media_id text check (media_id is null or char_length(media_id) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists guestbook_created_at_idx on public.guestbook(created_at desc);
create index if not exists gallery_views_event_idx on public.gallery_views(event_id, created_at desc);
create index if not exists favorites_visitor_idx on public.favorites(visitor_id, event_id);
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('login','logout','approve_guestbook','delete_guestbook','update_event','change_event_code','change_all_event_codes')),
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);

-- Keep the audit action constraint current on existing databases too.
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_action_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_action_check check (action in ('login','logout','approve_guestbook','delete_guestbook','update_event','change_event_code','change_all_event_codes'));



alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.guestbook enable row level security;
alter table public.favorites enable row level security;
alter table public.gallery_views enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Keep secret_code_hash out of browser-visible data. The browser reads this view; only admins can read the base table.
drop view if exists public.events_public;
create view public.events_public as
select id,slug,title,date,description,cover_image,cover_image_drive_id,drive_folder_id,photos_drive_folder_id,photos_drive_folder_id_2,videos_drive_folder_id,videos_drive_folder_id_2,sort_order,is_active,photos_enabled,videos_enabled,slideshow_enabled,qr_enabled,venue_name,venue_address,maps_url,updated_at
from public.events where is_active = true;
grant select on public.events_public to anon, authenticated;

-- Base event table is admin-only. The server-side Vercel unlock function uses the service role to read the hash.
drop policy if exists "public can view active events" on public.events;

-- Public guestbook: visitors may submit, but only approved entries can be read.
-- Drop ALL legacy guestbook policies first. Old restrictive policies can make a
-- valid INSERT fail even when the new policy looks correct.
do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guestbook'
  loop
    execute format('drop policy if exists %I on public.guestbook', policy_name);
  end loop;
end $$;

create policy "public can submit guestbook" on public.guestbook
for insert
with check (
  approved = false
  and char_length(btrim(name)) between 1 and 80
  and char_length(btrim(message)) between 1 and 500
);

create policy "public can read approved guestbook" on public.guestbook
for select
using (approved = true);

create policy "admins can manage guestbook" on public.guestbook
for all
using (public.is_admin())
with check (public.is_admin());

-- Anonymous visitor IDs are client-controlled and cannot be trusted by RLS.
-- Do not expose the favorites table to anon users until favorites are backed by
-- authenticated users or a server-issued visitor token.
drop policy if exists "public can read own favorites" on public.favorites;
drop policy if exists "public can add favorites" on public.favorites;
drop policy if exists "public can remove favorites" on public.favorites;

-- Analytics writes are server-side through /api/analytics. Guests do not receive direct INSERT access.
drop policy if exists "public can record views" on public.gallery_views;

-- Admin policies. Create the first admin profile manually with the SQL Editor
-- or service role; users must NEVER be allowed to promote themselves.
drop policy if exists "admins can manage events" on public.events;
create policy "admins can manage events" on public.events for all using (public.is_admin()) with check (public.is_admin());

-- Remove any legacy profiles policies. A leftover policy from an older
-- migration can still participate in RLS evaluation and cause recursion.
do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_name);
  end loop;
end $$;

-- Users may read ONLY their own profile. This policy deliberately does not
-- call is_admin(), so reading profiles can never recursively evaluate itself.
create policy "users can read own profile"
on public.profiles for select
using (id = auth.uid());

-- Only an existing admin can create/change/delete profile rows. In particular,
-- an authenticated user cannot insert/update their own row to role='admin'.
create policy "admins can insert profiles"
on public.profiles for insert
with check (public.is_admin());

create policy "admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

create policy "admins can delete profiles"
on public.profiles for delete
using (public.is_admin());

drop policy if exists "admins can read analytics" on public.gallery_views;
create policy "admins can read analytics" on public.gallery_views for select using (public.is_admin());

drop policy if exists "admins can read audit logs" on public.admin_audit_logs;
create policy "admins can read audit logs" on public.admin_audit_logs for select using (public.is_admin());
drop policy if exists "admins can insert audit logs" on public.admin_audit_logs;
create policy "admins can insert audit logs" on public.admin_audit_logs for insert with check ((select auth.uid()) = admin_id and public.is_admin());

-- Initial events. The seed hash is used only when an event is first created.
-- IMPORTANT: re-running this schema never overwrites an administrator's changed security code.
insert into public.events (slug,title,description,drive_folder_id,secret_code_hash,sort_order)
values
('engagement','Engagement','The beautiful beginning of our journey, filled with love, laughter, and blessings.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',1),
('pre-wedding','Pre-Wedding Photoshoot','A collection of smiles and little moments before we began our forever.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',2),
('lagnapathrika','Lagnapathrika','A special traditional celebration surrounded by family and blessings.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',3),
('mangala-snanam','Mangala Snanam','An auspicious beginning to the wedding celebrations with our loved ones.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',4),
('haldi','Haldi','Colors, laughter, music, and the people who made this day unforgettable.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',5),
('prathanam','Prathanam','A meaningful ceremony filled with tradition, blessings, and togetherness.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',6),
('upanayanam','Upanayanam','A sacred and memorable family occasion filled with tradition and love.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',7),
('marriage','Marriage','The day our forever began — a celebration of love, family, and a beautiful new chapter.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',8),
('satyanarayana-vratham','Sathya Narayana Vratham','A peaceful celebration of gratitude, devotion, and blessings for our married life.','1G5IZFca5VNZdK3zbDLP977zIWvqerZcv','189ceb176885b12e566d40a3db6fc8323a1593ef6de7b8d6b24b4452166cbd12',9)
on conflict (slug) do update set title=excluded.title,description=excluded.description,drive_folder_id=excluded.drive_folder_id,sort_order=excluded.sort_order;

revoke insert on public.gallery_views from anon, authenticated;

revoke insert on public.guestbook from anon, authenticated;

-- =========================================================
-- V2 WEDDING MANAGEMENT FEATURES
-- Safe additive migration. Existing event security codes are NOT changed.
alter table public.events add column if not exists secret_code_encrypted text;
-- =========================================================

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text check (email is null or char_length(email) <= 200),
  phone text check (phone is null or char_length(phone) <= 30),
  attending boolean not null,
  guest_count integer not null default 0 check (guest_count between 0 and 20),
  message text not null default '' check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rsvps_created_at_idx on public.rsvps(created_at desc);
create index if not exists rsvps_attending_idx on public.rsvps(attending, created_at desc);
alter table public.rsvps enable row level security;
drop policy if exists "public can submit rsvps" on public.rsvps;
create policy "public can submit rsvps" on public.rsvps for insert with check (
  char_length(btrim(name)) between 1 and 100
  and guest_count between 0 and 20
);
drop policy if exists "admins can manage rsvps" on public.rsvps;
create policy "admins can manage rsvps" on public.rsvps for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  phone text,
  guest_group text not null default 'Friends',
  relationship text,
  invited boolean not null default true,
  rsvp_id uuid references public.rsvps(id) on delete set null,
  guest_count integer not null default 1 check (guest_count between 0 and 20),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists guests_group_idx on public.guests(guest_group);
alter table public.guests enable row level security;
drop policy if exists "admins can manage guests" on public.guests;
create policy "admins can manage guests" on public.guests for all using (public.is_admin()) with check (public.is_admin());

alter table public.guestbook add column if not exists moderation_status text not null default 'pending';
alter table public.guestbook add column if not exists featured boolean not null default false;
alter table public.guestbook drop constraint if exists guestbook_moderation_status_check;
alter table public.guestbook add constraint guestbook_moderation_status_check check (moderation_status in ('pending','approved','rejected'));
update public.guestbook set moderation_status = case when approved then 'approved' else 'pending' end where moderation_status = 'pending';
create index if not exists guestbook_status_idx on public.guestbook(moderation_status, created_at desc);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings" on public.site_settings for select using (true);
drop policy if exists "admins can manage site settings" on public.site_settings;
create policy "admins can manage site settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings(key,value) values
('wedding', '{"groomName":"Hareesh Kumar","brideName":"Prasanna","date":"2026-04-04","time":"08:59 AM","venue":"Kolping Community Hall","address":"5th Ln, Postal Colony, Donka Road, Guntur-522002, Andhra Pradesh","mapsUrl":"","heroTitle":"We Are Married","heroSubtitle":"Together with our families, we invite you to celebrate our journey.","description":"The wedding story and memories of Hareesh & Prasanna."}'::jsonb),
('theme', '{"primary":"rose","headingFont":"Cormorant Garamond","bodyFont":"Josefin Sans","animations":true,"darkMode":false}'::jsonb)
on conflict (key) do nothing;

-- Homepage media/content defaults. Admin can change all of these later from Control Center -> Content.
update public.site_settings
set value = value || jsonb_build_object(
  'groomImageDriveId', coalesce(value->>'groomImageDriveId', ''),
  'brideImageDriveId', coalesce(value->>'brideImageDriveId', ''),
  'heroImageDriveId', coalesce(value->>'heroImageDriveId', ''),
  'introVideoDriveId', coalesce(value->>'introVideoDriveId', '1ANoJPcBbypy3IRRVx8WMxGo5uEXMd6nW'),
  'galleryDriveFolderId', coalesce(value->>'galleryDriveFolderId', '1G5IZFca5VNZdK3zbDLP977zIWvqerZcv'),
  'blogYoutubeUrl', coalesce(value->>'blogYoutubeUrl', 'https://www.youtube.com/watch?v=tNr6YD-vnZQ'),
  'blogTitle', coalesce(value->>'blogTitle', 'We welcome to our grand wedding'),
  'blogAuthor', coalesce(value->>'blogAuthor', '-'),
  'blogDate', coalesce(value->>'blogDate', '04 Apr 2026'),
  'blogEyebrow', coalesce(value->>'blogEyebrow', 'Latest News'),
  'blogHeading', coalesce(value->>'blogHeading', 'Our Latest Wedding News')
)
where key = 'wedding';

update public.site_settings
set value = value || jsonb_build_object(
  'loadingLogoDriveId', coalesce(value->>'loadingLogoDriveId', ''),
  'loadingText', coalesce(value->>'loadingText', 'Welcome to our wedding'),
  'loadingDuration', coalesce((value->>'loadingDuration')::int, 1200),
  'introEnabled', coalesce((value->>'introEnabled')::boolean, true),
  'galleryHeading', coalesce(value->>'galleryHeading', 'Sweet Memories'),
  'galleryDescription', coalesce(value->>'galleryDescription', 'Our Captured Moments'),
  'galleryLimit', coalesce((value->>'galleryLimit')::int, 14),
  'rsvpHeading', coalesce(value->>'rsvpHeading', 'RSVP'),
  'rsvpDescription', coalesce(value->>'rsvpDescription', 'Your presence would mean the world to us.'),
  'guestbookHeading', coalesce(value->>'guestbookHeading', 'Guestbook'),
  'guestbookDescription', coalesce(value->>'guestbookDescription', 'Leave a little love and a message for us to remember.'),
  'footerText', coalesce(value->>'footerText', 'Made with love for our special day'),
  'footerCopyright', coalesce(value->>'footerCopyright', ''),
  'timeline', coalesce(value->'timeline', '[{"title":"Welcome Drinks","time":"11:00 AM","icon":"Wine","visible":true},{"title":"Ceremony","time":"8:59 AM","icon":"Church","visible":true},{"title":"Photos","time":"12:00 PM","icon":"Camera","visible":true},{"title":"Dinner","time":"1:00 PM","icon":"UtensilsCrossed","visible":true},{"title":"Depart","time":"2:00 PM","icon":"LogOut","visible":true}]'::jsonb),
  'blogs', coalesce(value->'blogs', '[]'::jsonb)
)
where key = 'wedding';

insert into public.site_settings(key,value) values
('siteControl', '{"mode":"all","pages":{"gallery":true,"videos":true,"upload":true,"blog":true},"maintenance":{"enabled":false,"title":"We''ll be back soon","description":"We''re preparing something special for you. Please check back shortly.","buttonText":"Back to Home"}}'::jsonb),
('siteHistory', '[]'::jsonb),
('siteDraft', '{}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.homepage_sections (
  key text primary key,
  label text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.homepage_sections enable row level security;
drop policy if exists "public can read homepage sections" on public.homepage_sections;
create policy "public can read homepage sections" on public.homepage_sections for select using (true);
drop policy if exists "admins can manage homepage sections" on public.homepage_sections;
create policy "admins can manage homepage sections" on public.homepage_sections for all using (public.is_admin()) with check (public.is_admin());
insert into public.homepage_sections(key,label,enabled,sort_order) values
('hero','Hero',true,1),('couple','Couple',true,2),('story','Story & Memories',true,3),('gallery','Gallery',true,4),('events','Wedding & Venue',true,5),('rsvp','RSVP',true,6),('guestbook','Guestbook',true,7),('blog','Blog',false,8),('footer','Footer',true,9)
on conflict (key) do nothing;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info',
  title text not null,
  message text not null default '',
  target text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on public.notifications(created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "admins can manage notifications" on public.notifications;
create policy "admins can manage notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.photo_reactions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  event_id uuid references public.events(id) on delete cascade,
  photo_id text not null,
  reaction text not null check (reaction in ('heart','love','smile')),
  created_at timestamptz not null default now(),
  unique(visitor_id,event_id,photo_id,reaction)
);
alter table public.photo_reactions enable row level security;
drop policy if exists "public can add reactions" on public.photo_reactions;
create policy "public can add reactions" on public.photo_reactions for insert with check (char_length(visitor_id) <= 100);
drop policy if exists "admins can read reactions" on public.photo_reactions;
create policy "admins can read reactions" on public.photo_reactions for select using (public.is_admin());

-- Extend audit actions without modifying existing records.
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_action_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_action_check check (action in (
  'login','logout','approve_guestbook','delete_guestbook','update_event','change_event_code','change_all_event_codes',
  'reject_guestbook','feature_guestbook','update_rsvp','delete_rsvp','create_guest','update_guest',
  'delete_guest','update_settings','update_homepage','create_notification','delete_notification'
));


-- Optional guest-upload album storage. Create this bucket only if you want public guest photo uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-guest-uploads','wedding-guest-uploads',false,10485760,ARRAY['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- V3 EVENT MEDIA CONFIGURATION
-- Separate Google Drive folders for photos and videos, plus a Drive image ID
-- for each event cover. Existing drive_folder_id is retained for backward compatibility.
alter table public.events add column if not exists photos_drive_folder_id text;
alter table public.events add column if not exists photos_drive_folder_id_2 text;
alter table public.events add column if not exists videos_drive_folder_id text;
alter table public.events add column if not exists videos_drive_folder_id_2 text;
alter table public.events add column if not exists cover_image_drive_id text;

update public.events
set photos_drive_folder_id = coalesce(nullif(photos_drive_folder_id, ''), drive_folder_id),
    videos_drive_folder_id = coalesce(nullif(videos_drive_folder_id, ''), drive_folder_id)
where photos_drive_folder_id is null
   or photos_drive_folder_id = ''
   or videos_drive_folder_id is null
   or videos_drive_folder_id = '';

-- Keep the public view in sync for the new event media fields.
drop view if exists public.events_public;
create view public.events_public as
select id,slug,title,date,description,cover_image,cover_image_drive_id,drive_folder_id,
       photos_drive_folder_id,photos_drive_folder_id_2,videos_drive_folder_id,videos_drive_folder_id_2,sort_order,is_active,
       photos_enabled,videos_enabled,slideshow_enabled,qr_enabled,
       venue_name,venue_address,maps_url,updated_at
from public.events where is_active = true;
grant select on public.events_public to anon, authenticated;
