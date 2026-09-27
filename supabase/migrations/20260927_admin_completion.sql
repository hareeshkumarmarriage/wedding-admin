-- 20260927 admin completion: durable alerts, backups and trash/recovery.
-- Additive migration; existing content and security policies remain intact.

alter table public.notifications
  add column if not exists enabled boolean not null default true,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists dismissible boolean not null default true,
  add column if not exists page_scope text not null default 'all',
  add column if not exists cta_label text,
  add column if not exists cta_url text;

create index if not exists notifications_active_window_idx
  on public.notifications(enabled, starts_at, ends_at, created_at desc);

drop view if exists public.notifications_public;
create view public.notifications_public as
select id, type, title, message, target, dismissible, page_scope, cta_label, cta_url, starts_at, ends_at, created_at
from public.notifications
where enabled = true
  and coalesce(target, 'public') in ('public','landing','all')
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
order by created_at desc;
grant select on public.notifications_public to anon, authenticated;

create table if not exists public.admin_backups (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Backup',
  backup_type text not null default 'content',
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_backups enable row level security;
drop policy if exists "admins can manage backups" on public.admin_backups;
create policy "admins can manage backups"
on public.admin_backups for all
using (public.is_admin())
with check (public.is_admin());

create index if not exists admin_backups_created_idx
  on public.admin_backups(created_at desc);

create table if not exists public.trash_items (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  label text not null default 'Deleted item',
  snapshot jsonb not null default '{}'::jsonb,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  expires_at timestamptz,
  restored_at timestamptz
);

alter table public.trash_items enable row level security;
drop policy if exists "admins can manage trash" on public.trash_items;
create policy "admins can manage trash"
on public.trash_items for all
using (public.is_admin())
with check (public.is_admin());

create index if not exists trash_items_active_idx
  on public.trash_items(deleted_at desc)
  where restored_at is null;

comment on table public.admin_backups is 'Durable admin content/database snapshots. Media bytes remain in their source storage.';
comment on table public.trash_items is 'Soft-delete recovery snapshots with retention metadata.';
