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
  if new.key = 'appearance.theme' then
    canonical := coalesce((select value from public.site_settings where key = 'theme'), '{}'::jsonb);
    theme_name := coalesce(new.value->>'theme','');
    canonical := jsonb_set(canonical, '{primary}', to_jsonb(case theme_name
      when 'Romantic Rose' then 'rose'
      when 'Elegant Ivory' then 'blush'
      when 'Royal Burgundy' then 'mauve'
      when 'Modern Minimal' then 'sage'
      when 'Midnight Gold' then 'gold'
      else lower(replace(theme_name,' ','-')) end), true);
    insert into public.site_settings(key,value,updated_at) values ('theme',canonical,now())
    on conflict (key) do update set value=excluded.value,updated_at=excluded.updated_at;

  elsif new.key = 'appearance.typography' then
    canonical := coalesce((select value from public.site_settings where key = 'theme'), '{}'::jsonb);
    canonical := jsonb_set(canonical, '{headingFont}', to_jsonb(coalesce(new.value->>'heading_font','Playfair Display')), true);
    canonical := jsonb_set(canonical, '{bodyFont}', to_jsonb(coalesce(new.value->>'body_font','Josefin Sans')), true);
    insert into public.site_settings(key,value,updated_at) values ('theme',canonical,now())
    on conflict (key) do update set value=excluded.value,updated_at=excluded.updated_at;

  elsif new.key in ('loading-intro.loading-screen','loading-intro.loading-text','loading-intro.blink-heart','loading-intro.loading-duration','loading-intro.intro-video','loading-intro.autoplay','loading-intro.mute','loading-intro.skip-button','loading-intro.fullscreen') then
    canonical := coalesce((select value from public.site_settings where key = 'wedding'), '{}'::jsonb);
    if new.key = 'loading-intro.loading-screen' then canonical := jsonb_set(canonical,'{loadingEnabled}',to_jsonb(coalesce((new.value->>'enabled')::boolean,true)),true); end if;
    if new.key = 'loading-intro.loading-text' then canonical := jsonb_set(canonical,'{loadingText}',to_jsonb(coalesce(new.value->>'text','')),true); end if;
    if new.key = 'loading-intro.blink-heart' then canonical := jsonb_set(canonical,'{loadingHeartEnabled}',to_jsonb(coalesce((new.value->>'enabled')::boolean,true)),true); canonical := jsonb_set(canonical,'{loadingText2}',to_jsonb(coalesce(new.value->>'text','')),true); end if;
    if new.key = 'loading-intro.loading-duration' then canonical := jsonb_set(canonical,'{loadingDuration}',to_jsonb(greatest(500,least(30000,coalesce((new.value->>'duration_ms')::integer,1200)))),true); end if;
    if new.key = 'loading-intro.intro-video' then canonical := jsonb_set(canonical,'{introVideoDriveId}',to_jsonb(coalesce(new.value->>'drive_id','')),true); canonical := jsonb_set(canonical,'{introEnabled}',to_jsonb(coalesce((new.value->>'show')::boolean,false)),true); end if;
    if new.key = 'loading-intro.autoplay' then canonical := jsonb_set(canonical,'{introAutoplay}',to_jsonb(coalesce((new.value->>'enabled')::boolean,true)),true); end if;
    if new.key = 'loading-intro.mute' then canonical := jsonb_set(canonical,'{introMuted}',to_jsonb(coalesce((new.value->>'enabled')::boolean,true)),true); end if;
    if new.key = 'loading-intro.skip-button' then canonical := jsonb_set(canonical,'{introSkip}',to_jsonb(coalesce((new.value->>'enabled')::boolean,true)),true); end if;
    if new.key = 'loading-intro.fullscreen' then canonical := jsonb_set(canonical,'{introFullscreen}',to_jsonb(coalesce((new.value->>'enabled')::boolean,true)),true); end if;
    insert into public.site_settings(key,value,updated_at) values ('wedding',canonical,now())
    on conflict (key) do update set value=excluded.value,updated_at=excluded.updated_at;

  elsif new.key in ('website.home','website.couple','settings.wedding','settings.date-time') then
    canonical := coalesce((select value from public.site_settings where key = 'wedding'), '{}'::jsonb);
    if new.key='website.home' then canonical := jsonb_set(canonical,'{heroTitle}',to_jsonb(coalesce(new.value->>'title','We Are Married')),true); end if;
    if new.key='website.couple' then canonical := jsonb_set(canonical,'{groomName}',to_jsonb(coalesce(new.value->>'groom_name','')),true); canonical := jsonb_set(canonical,'{brideName}',to_jsonb(coalesce(new.value->>'bride_name','')),true); end if;
    if new.key='settings.wedding' then canonical := jsonb_set(canonical,'{groomName}',to_jsonb(coalesce(new.value->>'groom','')),true); canonical := jsonb_set(canonical,'{brideName}',to_jsonb(coalesce(new.value->>'bride','')),true); end if;
    if new.key='settings.date-time' then canonical := jsonb_set(canonical,'{date}',to_jsonb(coalesce(new.value->>'wedding_date','')),true); canonical := jsonb_set(canonical,'{timezone}',to_jsonb(coalesce(new.value->>'timezone','Asia/Kolkata')),true); end if;
    insert into public.site_settings(key,value,updated_at) values ('wedding',canonical,now())
    on conflict (key) do update set value=excluded.value,updated_at=excluded.updated_at;

  elsif new.key in ('social.instagram','social.youtube','social.facebook','social.whatsapp','integrations.instagram','integrations.youtube','integrations.facebook','integrations.whatsapp') then
    canonical := coalesce((select value from public.site_settings where key = 'social'), '{}'::jsonb);
    canonical := jsonb_set(canonical, case when new.key like '%instagram' then '{instagramUrl}' when new.key like '%youtube' then '{youtubeUrl}' when new.key like '%facebook' then '{facebookUrl}' else '{whatsappUrl}' end, to_jsonb(coalesce(new.value->>'url','')), true);
    insert into public.site_settings(key,value,updated_at) values ('social',canonical,now())
    on conflict (key) do update set value=excluded.value,updated_at=excluded.updated_at;

  elsif new.key = 'settings.website' then
    canonical := coalesce((select value from public.site_settings where key = 'siteControl'), '{}'::jsonb);
    canonical := jsonb_set(canonical,'{maintenance,enabled}',to_jsonb(coalesce((new.value->>'maintenance')::boolean,false)),true);
    insert into public.site_settings(key,value,updated_at) values ('siteControl',canonical,now())
    on conflict (key) do update set value=excluded.value,updated_at=excluded.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_admin_panel_settings on public.site_settings;
create trigger trg_sync_admin_panel_settings
after insert or update of value on public.site_settings
for each row execute function public.sync_admin_panel_setting_to_public();

comment on function public.sync_admin_panel_setting_to_public() is 'Keeps namespaced admin control-center settings synchronized with canonical public wedding, theme, social, and site-control settings.';
