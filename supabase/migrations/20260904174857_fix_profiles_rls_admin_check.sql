-- Fix admin role checks used by RLS policies.
-- The role lookup must bypass profiles RLS to avoid both 42501 errors
-- and recursive policy evaluation. Keep the helper in the private schema.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Keep the public helper for existing application calls, but delegate the
-- privileged role lookup to the private security-definer helper.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = 'public', 'auth', 'pg_catalog'
as $$
  select private.is_admin();
$$;

revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
