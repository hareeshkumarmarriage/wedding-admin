-- Restore public read paths used by the landing page.
-- Admin tables remain protected; these views expose only non-sensitive public content.

create or replace view public.site_settings_public as
select key, value
from public.site_settings
where key in ('wedding', 'theme', 'siteControl');

create or replace view public.homepage_sections_public as
select key, label, enabled, sort_order, updated_at
from public.homepage_sections;

grant select on public.site_settings_public to anon, authenticated;
grant select on public.homepage_sections_public to anon, authenticated;

-- The existing public event/notification views contain only fields intended for
-- the landing page. Keep them readable by visitors without granting direct access
-- to the protected base tables.
alter view public.events_public set (security_invoker = false);
alter view public.notifications_public set (security_invoker = false);
grant select on public.events_public to anon, authenticated;
grant select on public.notifications_public to anon, authenticated;

-- Homepage section visibility is public presentation metadata. Keep the base table
-- RLS-enabled and allow only SELECT for visitors.
grant select on table public.homepage_sections to anon;
drop policy if exists "public can read homepage sections" on public.homepage_sections;
create policy "public can read homepage sections"
on public.homepage_sections
for select to anon, authenticated
using (true);
