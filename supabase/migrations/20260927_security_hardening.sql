-- 20260927 security hardening for public views and published snapshots.
alter table public.admin_published_snapshot enable row level security;
drop policy if exists "admins can read published snapshot" on public.admin_published_snapshot;
create policy "admins can read published snapshot"
on public.admin_published_snapshot for select
to authenticated
using (public.is_admin());

alter view public.homepage_sections_public set (security_invoker = true);
alter view public.events_public set (security_invoker = true);
alter view public.site_settings_public set (security_invoker = true);
alter view public.notifications_public set (security_invoker = true);
