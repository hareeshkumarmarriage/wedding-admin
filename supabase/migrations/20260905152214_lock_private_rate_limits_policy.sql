-- The rate limiter is intentionally server-side only.
-- No anon/authenticated policies are granted; service_role access is explicit.
create policy "service roles can manage private rate limits"
on private.rate_limits
for all
to service_role
using (true)
with check (true);
