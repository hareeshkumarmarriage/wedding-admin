create or replace function public.sync_admin_panel_setting_to_public()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  canonical jsonb;
begin
  if new.key like 'website.%' then
    canonical := coalesce((select value from public.site_settings where key='wedding'), '{}'::jsonb);
    if new.key='website.home.title' then canonical:=jsonb_set(canonical,'{heroTitle}',new.value,true); end if;
    if new.key='website.home.description' then canonical:=jsonb_set(canonical,'{description}',new.value,true); end if;
    if new.key='website.home.show_countdown' then canonical:=jsonb_set(canonical,'{countdownEnabled}',new.value,true); end if;
    if new.key='website.home.show_share' then canonical:=jsonb_set(canonical,'{shareEnabled}',new.value,true); end if;
    if new.key='website.home.share_position' then canonical:=jsonb_set(canonical,'{sharePosition}',new.value,true); end if;
    if new.key='website.couple.groom' then canonical:=jsonb_set(canonical,'{groomName}',new.value,true); end if;
    if new.key='website.couple.bride' then canonical:=jsonb_set(canonical,'{brideName}',new.value,true); end if;
    if new.key='website.story.title' then canonical:=jsonb_set(canonical,'{storyTitle}',new.value,true); end if;
    if new.key='website.story.content' then canonical:=jsonb_set(canonical,'{storyDescription}',new.value,true); end if;
    if new.key='website.story.enabled' then canonical:=jsonb_set(canonical,'{storyEnabled}',new.value,true); end if;
    if new.key='website.gallery.title' then canonical:=jsonb_set(canonical,'{galleryHeading}',new.value,true); end if;
    if new.key='website.gallery.description' then canonical:=jsonb_set(canonical,'{galleryDescription}',new.value,true); end if;
    if new.key='website.gallery.enabled' then canonical:=jsonb_set(canonical,'{galleryEnabled}',new.value,true); end if;
    if new.key='website.events.title' then canonical:=jsonb_set(canonical,'{eventsHeading}',new.value,true); end if;
    if new.key='website.events.description' then canonical:=jsonb_set(canonical,'{eventsDescription}',new.value,true); end if;
    if new.key='website.events.enabled' then canonical:=jsonb_set(canonical,'{eventsEnabled}',new.value,true); end if;
    if new.key='website.rsvp.title' then canonical:=jsonb_set(canonical,'{rsvpHeading}',new.value,true); end if;
    if new.key='website.rsvp.description' then canonical:=jsonb_set(canonical,'{rsvpDescription}',new.value,true); end if;
    if new.key='website.rsvp.enabled' then canonical:=jsonb_set(canonical,'{rsvpEnabled}',new.value,true); end if;
    if new.key='website.guestbook.title' then canonical:=jsonb_set(canonical,'{guestbookHeading}',new.value,true); end if;
    if new.key='website.guestbook.description' then canonical:=jsonb_set(canonical,'{guestbookDescription}',new.value,true); end if;
    if new.key='website.guestbook.enabled' then canonical:=jsonb_set(canonical,'{guestbookEnabled}',new.value,true); end if;
    if new.key='website.footer.text' then canonical:=jsonb_set(canonical,'{footerText}',new.value,true); end if;
    if new.key='website.footer.show_social' then canonical:=jsonb_set(canonical,'{footerShowSocial}',new.value,true); end if;
    if new.key='website.footer.enabled' then canonical:=jsonb_set(canonical,'{footerEnabled}',new.value,true); end if;
    if new.key='website.navigation.sticky' then canonical:=jsonb_set(canonical,'{navigationSticky}',new.value,true); end if;
    if new.key='website.navigation.show_home' then canonical:=jsonb_set(canonical,'{navigationHome}',new.value,true); end if;
    if new.key='website.navigation.show_events' then canonical:=jsonb_set(canonical,'{navigationEvents}',new.value,true); end if;
    if new.key='website.navigation.show_guestbook' then canonical:=jsonb_set(canonical,'{navigationGuestbook}',new.value,true); end if;
    insert into public.site_settings(key,value,updated_at) values('wedding',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  end if;
  return new;
end;
$$;
