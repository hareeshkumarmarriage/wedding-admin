-- Admin profiles, session tracking, visitor tracking, and public notifications.
create extension if not exists pgcrypto;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists profiles_username_unique on public.profiles(lower(username)) where username is not null;

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text,
  role text not null default 'admin',
  ip_address text,
  device text,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists admin_sessions_active_idx on public.admin_sessions(last_seen_at desc) where revoked_at is null;

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  visitor_name text not null,
  role text not null default 'visitor',
  ip_address text,
  device text,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  blocked boolean not null default false
);
create index if not exists visitor_sessions_active_idx on public.visitor_sessions(last_seen_at desc);

alter table public.admin_sessions enable row level security;
alter table public.visitor_sessions enable row level security;

drop policy if exists "admins manage admin sessions" on public.admin_sessions;
create policy "admins manage admin sessions" on public.admin_sessions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage visitor sessions" on public.visitor_sessions;
create policy "admins manage visitor sessions" on public.visitor_sessions for all using (public.is_admin()) with check (public.is_admin());

-- Public announcements are exposed through a safe view; admin-only write access remains on notifications.
drop view if exists public.notifications_public;
create view public.notifications_public as
select id, type, title, message, target, created_at
from public.notifications
where coalesce(target, 'public') in ('public','landing','all')
order by created_at desc;
grant select on public.notifications_public to anon, authenticated;

-- Expand audit action vocabulary for profile/session/visitor changes.
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_action_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_action_check check (action in (
  'login','logout','approve_guestbook','delete_guestbook','update_event','change_event_code','change_all_event_codes',
  'reject_guestbook','feature_guestbook','update_rsvp','delete_rsvp','create_guest','update_guest','delete_guest',
  'update_settings','update_homepage','create_notification','delete_notification','create_profile','update_profile',
  'delete_profile','force_logout','block_visitor','unblock_visitor','visitor_session'
));
