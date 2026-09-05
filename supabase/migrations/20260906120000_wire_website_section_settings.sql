create or replace function public.sync_admin_panel_setting_to_public()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.wedding_settings (id, config, updated_at)
  values ('default', '{}'::jsonb, now())
  on conflict (id) do nothing;

  update public.wedding_settings
  set config = jsonb_set(
    config,
    case
      when new.key = 'website.gallery.title' then '{galleryHeading}'::text[]
      when new.key = 'website.gallery.description' then '{galleryDescription}'::text[]
      when new.key = 'website.gallery.enabled' then '{galleryEnabled}'::text[]
      when new.key = 'website.events.title' then '{eventsHeading}'::text[]
      when new.key = 'website.events.description' then '{eventsDescription}'::text[]
      when new.key = 'website.events.enabled' then '{eventsEnabled}'::text[]
      when new.key = 'website.rsvp.title' then '{rsvpHeading}'::text[]
      when new.key = 'website.rsvp.description' then '{rsvpDescription}'::text[]
      when new.key = 'website.rsvp.enabled' then '{rsvpEnabled}'::text[]
      when new.key = 'website.guestbook.title' then '{guestbookHeading}'::text[]
      when new.key = 'website.guestbook.description' then '{guestbookDescription}'::text[]
      when new.key = 'website.guestbook.enabled' then '{guestbookEnabled}'::text[]
      else null
    end,
    to_jsonb(new.value),
    true
  ), updated_at = now()
  where new.key in (
    'website.gallery.title','website.gallery.description','website.gallery.enabled',
    'website.events.title','website.events.description','website.events.enabled',
    'website.rsvp.title','website.rsvp.description','website.rsvp.enabled',
    'website.guestbook.title','website.guestbook.description','website.guestbook.enabled'
  );

  return new;
end;
$$;
