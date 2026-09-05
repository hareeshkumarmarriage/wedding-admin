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
set search_path=public
as $$
  select s.id,s.user_id,s.username,s.role,s.device,s.last_seen_at,s.created_at,s.revoked_at
  from public.admin_sessions s
  where public.is_admin()
  order by s.last_seen_at desc
  limit 100;
$$;

create or replace function public.admin_revoke_session(p_session_id uuid)
returns boolean
language plpgsql
security invoker
set search_path=public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin authorization required';
  end if;
  update public.admin_sessions
  set revoked_at=coalesce(revoked_at,now())
  where id=p_session_id;
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
set search_path=public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin authorization required';
  end if;
  if p_role not in ('admin','editor','viewer') then
    raise exception 'Invalid role';
  end if;
  update public.profiles
  set role=p_role,
      username=nullif(trim(p_username),''),
      display_name=nullif(trim(p_display_name),''),
      updated_at=now()
  where id=p_user_id;
  return found;
end;
$$;

revoke all on function public.admin_list_sessions() from public,anon,authenticated;
grant execute on function public.admin_list_sessions() to authenticated;
revoke all on function public.admin_revoke_session(uuid) from public,anon,authenticated;
grant execute on function public.admin_revoke_session(uuid) to authenticated;
revoke all on function public.admin_update_profile(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_update_profile(uuid,text,text,text) to authenticated;
