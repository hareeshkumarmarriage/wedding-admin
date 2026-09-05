create or replace function public.sync_admin_panel_setting_to_public()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  canonical jsonb;
  theme_name text;
begin
  if new.key like 'appearance.theme.%' then
    canonical := coalesce((select value from public.site_settings where key='theme'), '{}'::jsonb);
    theme_name := coalesce(new.value #>> '{}','');
    if new.key='appearance.theme.theme' then canonical := jsonb_set(canonical,'{primary}',to_jsonb(case theme_name when 'Elegant' then 'rose' when 'Classic' then 'blush' when 'Modern' then 'sage' when 'Minimal' then 'mauve' else lower(theme_name) end),true); end if;
    insert into public.site_settings(key,value,updated_at) values('theme',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  elsif new.key='appearance.typography.font' then
    canonical := coalesce((select value from public.site_settings where key='theme'), '{}'::jsonb);
    canonical := jsonb_set(canonical,'{headingFont}',new.value,true);
    insert into public.site_settings(key,value,updated_at) values('theme',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  elsif new.key like 'loading-intro.%' then
    canonical := coalesce((select value from public.site_settings where key='wedding'), '{}'::jsonb);
    if new.key='loading-intro.loading-screen.enabled' then canonical:=jsonb_set(canonical,'{loadingEnabled}',new.value,true); end if;
    if new.key='loading-intro.loading-text.text' then canonical:=jsonb_set(canonical,'{loadingText}',new.value,true); end if;
    if new.key='loading-intro.blink-heart.text' then canonical:=jsonb_set(canonical,'{loadingText2}',new.value,true); end if;
    if new.key='loading-intro.blink-heart.enabled' then canonical:=jsonb_set(canonical,'{loadingHeartEnabled}',new.value,true); end if;
    if new.key='loading-intro.loading-duration.duration' then canonical:=jsonb_set(canonical,'{loadingDuration}',to_jsonb(greatest(500,least(30000,coalesce((new.value #>> '{}')::integer,1200)))),true); end if;
    if new.key='loading-intro.intro-video.drive_id' then canonical:=jsonb_set(canonical,'{introVideoDriveId}',new.value,true); end if;
    if new.key='loading-intro.intro-video.enabled' then canonical:=jsonb_set(canonical,'{introEnabled}',new.value,true); end if;
    if new.key='loading-intro.autoplay.enabled' then canonical:=jsonb_set(canonical,'{introAutoplay}',new.value,true); end if;
    if new.key='loading-intro.mute.enabled' then canonical:=jsonb_set(canonical,'{introMuted}',new.value,true); end if;
    if new.key='loading-intro.skip-button.enabled' then canonical:=jsonb_set(canonical,'{introSkip}',new.value,true); end if;
    insert into public.site_settings(key,value,updated_at) values('wedding',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  elsif new.key='website.home.title' then
    canonical:=coalesce((select value from public.site_settings where key='wedding'),'{}'::jsonb); canonical:=jsonb_set(canonical,'{heroTitle}',new.value,true);
    insert into public.site_settings(key,value,updated_at) values('wedding',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  elsif new.key='website.couple.groom' or new.key='settings.wedding.groom' then
    canonical:=coalesce((select value from public.site_settings where key='wedding'),'{}'::jsonb); canonical:=jsonb_set(canonical,'{groomName}',new.value,true);
    insert into public.site_settings(key,value,updated_at) values('wedding',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  elsif new.key='website.couple.bride' or new.key='settings.wedding.bride' then
    canonical:=coalesce((select value from public.site_settings where key='wedding'),'{}'::jsonb); canonical:=jsonb_set(canonical,'{brideName}',new.value,true);
    insert into public.site_settings(key,value,updated_at) values('wedding',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  elsif new.key='settings.date-time.wedding_date' or new.key='settings.date-time.timezone' then
    canonical:=coalesce((select value from public.site_settings where key='wedding'),'{}'::jsonb);
    if new.key='settings.date-time.wedding_date' then canonical:=jsonb_set(canonical,'{date}',new.value,true); else canonical:=jsonb_set(canonical,'{timezone}',new.value,true); end if;
    insert into public.site_settings(key,value,updated_at) values('wedding',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  elsif new.key like 'social.%' or new.key like 'integrations.%' then
    canonical:=coalesce((select value from public.site_settings where key='social'),'{}'::jsonb);
    if new.key like '%instagram.url' then canonical:=jsonb_set(canonical,'{instagramUrl}',new.value,true); end if;
    if new.key like '%youtube.url' then canonical:=jsonb_set(canonical,'{youtubeUrl}',new.value,true); end if;
    if new.key like '%facebook.url' then canonical:=jsonb_set(canonical,'{facebookUrl}',new.value,true); end if;
    if new.key like '%whatsapp.url' then canonical:=jsonb_set(canonical,'{whatsappUrl}',new.value,true); end if;
    insert into public.site_settings(key,value,updated_at) values('social',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  elsif new.key='settings.website.maintenance' then
    canonical:=coalesce((select value from public.site_settings where key='siteControl'),'{}'::jsonb); canonical:=jsonb_set(canonical,'{maintenance,enabled}',new.value,true);
    insert into public.site_settings(key,value,updated_at) values('siteControl',canonical,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  end if;
  return new;
end;
$$;