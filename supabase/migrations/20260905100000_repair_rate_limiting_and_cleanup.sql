-- Repair the application rate limiter and remove empty legacy tables.
-- The Vercel API calls public.consume_rate_limit with the service role key.

create schema if not exists private;

create table if not exists private.rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

create or replace function public.consume_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_started timestamptz;
  current_count integer;
  now_value timestamptz := clock_timestamp();
begin
  if p_key is null or length(p_key) = 0 or p_window_seconds < 1 or p_max < 1 then
    return true;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_key, 0));

  select window_started_at, request_count
    into current_started, current_count
    from private.rate_limits
   where key = p_key
   for update;

  if not found or current_started <= now_value - make_interval(secs => p_window_seconds) then
    insert into private.rate_limits(key, window_started_at, request_count)
    values (p_key, now_value, 1)
    on conflict (key) do update
      set window_started_at = excluded.window_started_at,
          request_count = excluded.request_count;
    return true;
  end if;

  if current_count >= p_max then
    return false;
  end if;

  update private.rate_limits
     set request_count = request_count + 1
   where key = p_key;
  return true;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- These tables were empty and are no longer referenced by the application.
drop table if exists public.guestbook_messages;
drop table if exists public.favorites;

-- Foreign-key indexes used by admin/session, guestbook, revision, and reaction lookups.
create index if not exists admin_activity_admin_id_idx on public.admin_activity(admin_id);
create index if not exists admin_publish_history_revision_id_idx on public.admin_publish_history(revision_id);
create index if not exists admin_publish_history_published_by_idx on public.admin_publish_history(published_by);
create index if not exists admin_revisions_created_by_idx on public.admin_revisions(created_by);
create index if not exists admin_revisions_published_at_idx on public.admin_revisions(published_at desc);
create index if not exists guestbook_event_id_idx on public.guestbook(event_id);
create index if not exists guests_rsvp_id_idx on public.guests(rsvp_id);
create index if not exists photo_reactions_event_id_idx on public.photo_reactions(event_id);
