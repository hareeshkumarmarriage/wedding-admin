create policy "admins can manage admin activity"
on public.admin_activity
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins can manage publish history"
on public.admin_publish_history
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins can manage revisions"
on public.admin_revisions
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
