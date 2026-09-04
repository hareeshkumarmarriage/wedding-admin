-- Keep the admin helper callable by authenticated users without
-- executing with definer privileges.

alter function public.is_admin() security invoker;
grant execute on function public.is_admin() to authenticated;
