-- Narrow admin RLS policies to authenticated users and public submission/read policies to anon.
-- This preserves the existing security model while avoiding overlapping permissive policies.

alter policy "admins can insert audit logs" on public.admin_audit_logs to authenticated;
alter policy "admins can read audit logs" on public.admin_audit_logs to authenticated;
alter policy "admins manage admin sessions" on public.admin_sessions to authenticated;
alter policy "admins can manage events" on public.events to authenticated;
alter policy "admins can read analytics" on public.gallery_views to authenticated;
alter policy "admins can manage guestbook" on public.guestbook to authenticated;
alter policy "admins can manage guests" on public.guests to authenticated;
alter policy "admins can manage homepage sections" on public.homepage_sections to authenticated;
alter policy "admins can manage notifications" on public.notifications to authenticated;
alter policy "admins can read reactions" on public.photo_reactions to authenticated;
alter policy "admins can delete profiles" on public.profiles to authenticated;
alter policy "admins can insert profiles" on public.profiles to authenticated;
alter policy "admins can update profiles" on public.profiles to authenticated;
alter policy "admins can manage rsvps" on public.rsvps to authenticated;
alter policy "admins can manage site settings" on public.site_settings to authenticated;
alter policy "admins manage visitor sessions" on public.visitor_sessions to authenticated;

alter policy "public can read approved guestbook" on public.guestbook to anon;
alter policy "public can submit guestbook" on public.guestbook to anon;
alter policy "public can submit rsvps" on public.rsvps to anon;
alter policy "public can read homepage sections" on public.homepage_sections to anon;
alter policy "public can read site settings" on public.site_settings to anon;
