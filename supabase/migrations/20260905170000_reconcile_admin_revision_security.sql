-- Reconcile the production admin revision/management RPC security state.
-- This migration is intentionally idempotent so the repository remains a
-- usable source of truth even when these objects were previously created by
-- an emergency production migration.

create or replace function public.admin_publish_revision(p_label text default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_revision_id uuid;
  v_version bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin authorization required';
  end if;

  select coalesce(max(version_no), 0) + 1 into v_version
  from public.admin_revisions;

  insert into public.admin_revisions (
    version_no, status, label, snapshot, created_by, created_at, published_at
  )
  values (
    v_version,
    'published',
    nullif(trim(p_label), ''),
    jsonb_build_object(
      'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.sort_order, e.id) from public.events e), '[]'::jsonb),
      'homepage_sections', coalesce((select jsonb_agg(to_jsonb(h) order by h.sort_order, h.key) from public.homepage_sections h), '[]'::jsonb),
      'site_settings', coalesce((select jsonb_object_agg(s.key, s.value) from public.site_settings s), '{}'::jsonb)
    ),
    auth.uid(),
    now(),
    now()
  )
  returning id into v_revision_id;

  insert into public.admin_publish_history (revision_id, action, published_by, created_at)
  values (v_revision_id, 'publish', auth.uid(), now());

  return v_revision_id;
end;
$$;

create or replace function public.admin_rollback_revision(p_revision_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_backup uuid;
  v_version bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin authorization required';
  end if;

  select snapshot into v_snapshot
  from public.admin_revisions
  where id = p_revision_id;

  if v_snapshot is null then
    raise exception 'Revision not found';
  end if;

  select coalesce(max(version_no), 0) + 1 into v_version
  from public.admin_revisions;

  insert into public.admin_revisions (
    version_no, status, label, snapshot, created_by, created_at, published_at
  )
  values (
    v_version,
    'published',
    'Pre-rollback backup',
    jsonb_build_object(
      'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.sort_order, e.id) from public.events e), '[]'::jsonb),
      'homepage_sections', coalesce((select jsonb_agg(to_jsonb(h) order by h.sort_order, h.key) from public.homepage_sections h), '[]'::jsonb),
      'site_settings', coalesce((select jsonb_object_agg(s.key, s.value) from public.site_settings s), '{}'::jsonb)
    ),
    auth.uid(),
    now(),
    now()
  )
  returning id into v_backup;

  -- Restore only data owned by the revision snapshot. Auth/security tables are
  -- deliberately excluded from snapshots and therefore cannot be overwritten.
  if jsonb_typeof(v_snapshot->'events') = 'array' then
    delete from public.events;
    insert into public.events
    select * from jsonb_populate_recordset(null::public.events, v_snapshot->'events');
  end if;

  if jsonb_typeof(v_snapshot->'homepage_sections') = 'array' then
    delete from public.homepage_sections;
    insert into public.homepage_sections
    select * from jsonb_populate_recordset(null::public.homepage_sections, v_snapshot->'homepage_sections');
  end if;

  if jsonb_typeof(v_snapshot->'site_settings') = 'object' then
    delete from public.site_settings;
    insert into public.site_settings (key, value)
    select key, value
    from jsonb_each(v_snapshot->'site_settings');
  end if;

  update public.admin_revisions
  set status = 'rolled_back'
  where id = p_revision_id;

  insert into public.admin_publish_history (revision_id, action, published_by, created_at)
  values (v_backup, 'rollback', auth.uid(), now());

  return v_backup;
end;
$$;

create or replace function public.admin_list_sessions()
returns table(
  id uuid,
  user_id uuid,
  username text,
  role text,
  device text,
  last_seen_at timestamptz,
  created_at timestamptz,
  revoked_at timestamptz
)
language sql
security invoker
set search_path = public
as $$
  select s.id, s.user_id, s.username, s.role, s.device,
         s.last_seen_at, s.created_at, s.revoked_at
  from public.admin_sessions s
  where public.is_admin()
  order by s.last_seen_at desc
  limit 100;
$$;

create or replace function public.admin_revoke_session(p_session_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin authorization required';
  end if;

  update public.admin_sessions
  set revoked_at = coalesce(revoked_at, now())
  where id = p_session_id;

  return found;
end;
$$;

create or replace function public.admin_update_profile(
  p_user_id uuid,
  p_role text,
  p_username text,
  p_display_name text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin authorization required';
  end if;

  if p_role not in ('admin', 'editor', 'viewer') then
    raise exception 'Invalid role';
  end if;

  update public.profiles
  set role = p_role,
      username = nullif(trim(p_username), ''),
      display_name = nullif(trim(p_display_name), ''),
      updated_at = now()
  where id = p_user_id;

  return found;
end;
$$;

revoke all on function public.admin_publish_revision(text) from public, anon;
grant execute on function public.admin_publish_revision(text) to authenticated;
revoke all on function public.admin_rollback_revision(uuid) from public, anon;
grant execute on function public.admin_rollback_revision(uuid) to authenticated;
revoke all on function public.admin_list_sessions() from public, anon;
grant execute on function public.admin_list_sessions() to authenticated;
revoke all on function public.admin_revoke_session(uuid) from public, anon;
grant execute on function public.admin_revoke_session(uuid) to authenticated;
revoke all on function public.admin_update_profile(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, text, text) to authenticated;

comment on function public.admin_publish_revision(text) is 'Creates an immutable admin revision snapshot and records the publish action. Admin-only, security invoker.';
comment on function public.admin_rollback_revision(uuid) is 'Restores an admin revision while preserving the current state as a backup revision. Admin-only, security invoker.';
comment on function public.admin_list_sessions() is 'Lists active/revoked admin sessions for authorized administrators.';
comment on function public.admin_revoke_session(uuid) is 'Revokes an admin session for authorized administrators.';
comment on function public.admin_update_profile(uuid, text, text, text) is 'Updates an admin profile role and display fields for authorized administrators.';
