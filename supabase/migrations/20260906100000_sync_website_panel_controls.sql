create or replace function public.sync_admin_panel_setting()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_key text;
  target_path text[];
begin
  if new.key like 'website.%' then
    target_key := 'wedding';
    case new.key
      when 'website.home.title' then target_path := array['heroTitle'];
      when 'website.home.description' then target_path := array['description'];
      when 'website.home.show_countdown' then target_path := array['countdownEnabled'];
      when 'website.home.show_share' then target_path := array['shareEnabled'];
      when 'website.home.share_position' then target_path := array['sharePosition'];
      when 'website.couple.groom' then target_path := array['groomName'];
      when 'website.couple.bride' then target_path := array['brideName'];
      when 'website.story.title' then target_path := array['storyTitle'];
      when 'website.story.content' then target_path := array['storyDescription'];
      when 'website.story.enabled' then target_path := array['storyEnabled'];
      when 'website.gallery.enabled' then target_path := array['galleryEnabled'];
      when 'website.events.enabled' then target_path := array['eventsEnabled'];
      when 'website.rsvp.enabled' then target_path := array['rsvpEnabled'];
      when 'website.guestbook.enabled' then target_path := array['guestbookEnabled'];
      when 'website.footer.text' then target_path := array['footerText'];
      when 'website.footer.show_social' then target_path := array['footerShowSocial'];
      when 'website.footer.enabled' then target_path := array['footerEnabled'];
      when 'website.navigation.sticky' then target_path := array['navigationSticky'];
      when 'website.navigation.show_home' then target_path := array['navigationHome'];
      when 'website.navigation.show_events' then target_path := array['navigationEvents'];
      when 'website.navigation.show_guestbook' then target_path := array['navigationGuestbook'];
      else target_path := null;
    end case;
    if target_path is not null then
      update public.site_settings
      set value = jsonb_set(coalesce(public.site_settings.value, '{}'::jsonb), target_path, new.value, true),
          updated_at = now()
      where public.site_settings.key = target_key;
    end if;
  end if;
  return new;
end;
$$;

alter function public.sync_admin_panel_setting() owner to postgres;
