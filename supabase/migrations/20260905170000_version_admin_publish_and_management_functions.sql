-- Version-control the production admin publishing functions.
-- These functions are SECURITY DEFINER but require public.is_admin().
create or replace function public.admin_publish_revision(p_label text default 'Manual publish')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin authorization required'; end if;
  insert into public.admin_revisions(version_no,status,label,snapshot,created_by,published_at)
  values (
    coalesce((select max(version_no)+1 from public.admin_revisions),1), 'published',
    left(coalesce(nullif(trim(p_label),''),'Manual publish'),120),
    jsonb_build_object(
      'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.sort_order) from public.events e),'[]'::jsonb),
      'homepage_sections', coalesce((select jsonb_agg(to_jsonb(h) order by h.sort_order) from public.homepage_sections h),'[]'::jsonb),
      'site_settings', coalesce((select jsonb_agg(to_jsonb(s) order by s.key) from public.site_settings s),'[]'::jsonb)
    ), auth.uid(), now()
  ) returning id into v_id;
  insert into public.admin_publish_history(revision_id,action,published_by) values(v_id,'publish',auth.uid());
  return v_id;
end; $$;

create or replace function public.admin_rollback_revision(p_revision_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r record; e jsonb; h jsonb; s jsonb; v_new uuid;
begin
  if not public.is_admin() then raise exception 'Admin authorization required'; end if;
  select * into r from public.admin_revisions where id=p_revision_id;
  if not found then raise exception 'Revision not found'; end if;
  if r.status <> 'published' then raise exception 'Only published revisions can be restored'; end if;
  insert into public.admin_revisions(version_no,status,label,snapshot,created_by)
  values(coalesce((select max(version_no)+1 from public.admin_revisions),1),'draft','Before rollback',
    jsonb_build_object(
      'events',coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order) from public.events x),'[]'::jsonb),
      'homepage_sections',coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order) from public.homepage_sections x),'[]'::jsonb),
      'site_settings',coalesce((select jsonb_agg(to_jsonb(x) order by x.key) from public.site_settings x),'[]'::jsonb)
    ),auth.uid()) returning id into v_new;
  for e in select * from jsonb_array_elements(r.snapshot->'events') loop
    update public.events set title=coalesce(e->>'title',title), date=case when e->>'date' is null or e->>'date'='' then null else (e->>'date')::date end,
      description=coalesce(e->>'description',description), cover_image=e->>'cover_image', cover_image_drive_id=e->>'cover_image_drive_id',
      drive_folder_id=coalesce(e->>'drive_folder_id',drive_folder_id), photos_drive_folder_id=e->>'photos_drive_folder_id',
      photos_drive_folder_id_2=e->>'photos_drive_folder_id_2', videos_drive_folder_id=e->>'videos_drive_folder_id',
      videos_drive_folder_id_2=e->>'videos_drive_folder_id_2', sort_order=coalesce((e->>'sort_order')::int,sort_order),
      is_active=coalesce((e->>'is_active')::boolean,is_active), photos_enabled=coalesce((e->>'photos_enabled')::boolean,photos_enabled),
      videos_enabled=coalesce((e->>'videos_enabled')::boolean,videos_enabled), slideshow_enabled=coalesce((e->>'slideshow_enabled')::boolean,slideshow_enabled),
      qr_enabled=coalesce((e->>'qr_enabled')::boolean,qr_enabled), venue_name=e->>'venue_name', venue_address=e->>'venue_address', maps_url=e->>'maps_url', updated_at=now()
    where id=(e->>'id')::uuid;
  end loop;
  for h in select * from jsonb_array_elements(r.snapshot->'homepage_sections') loop
    update public.homepage_sections set label=coalesce(h->>'label',label), enabled=coalesce((h->>'enabled')::boolean,enabled),
      sort_order=coalesce((h->>'sort_order')::int,sort_order), updated_at=now() where key=h->>'key';
  end loop;
  for s in select * from jsonb_array_elements(r.snapshot->'site_settings') loop
    insert into public.site_settings(key,value,updated_at) values(s->>'key',s->'value',now())
    on conflict(key) do update set value=excluded.value,updated_at=now();
  end loop;
  update public.admin_revisions set status='archived' where status='published' and id<>v_new;
  update public.admin_revisions set status='published',published_at=now(),label='Rollback to v'||r.version_no where id=v_new;
  insert into public.admin_publish_history(revision_id,action,published_by) values(v_new,'rollback',auth.uid());
  return v_new;
end; $$;

revoke all on function public.admin_publish_revision(text) from public,anon,authenticated;
grant execute on function public.admin_publish_revision(text) to authenticated;
revoke all on function public.admin_rollback_revision(uuid) from public,anon,authenticated;
grant execute on function public.admin_rollback_revision(uuid) to authenticated;
