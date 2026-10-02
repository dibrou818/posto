-- Replacing a place's opening hours (or tags) used to be "delete everything,
-- then insert the new rows" as two separate requests: if the insert failed,
-- the place was left with no hours at all. These functions do both in one
-- call, so Postgres runs it as a single transaction and a failure changes
-- nothing. SECURITY INVOKER (the default) on purpose: the existing owner
-- policies on opening_hours/place_tags still decide who may do this.

create or replace function public.replace_opening_hours(p_place_id uuid, p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.opening_hours where place_id = p_place_id;

  insert into public.opening_hours (place_id, day_of_week, open_time, close_time, zone_name)
  select p_place_id, r.day_of_week, r.open_time, r.close_time, r.zone_name
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
    as r(day_of_week smallint, open_time time, close_time time, zone_name text);
end;
$$;

create or replace function public.replace_place_tags(p_place_id uuid, p_tag_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.place_tags where place_id = p_place_id;

  insert into public.place_tags (place_id, tag_id)
  select p_place_id, t from unnest(coalesce(p_tag_ids, '{}'::uuid[])) as t;
end;
$$;

revoke execute on function public.replace_opening_hours(uuid, jsonb) from public, anon;
revoke execute on function public.replace_place_tags(uuid, uuid[]) from public, anon;
grant execute on function public.replace_opening_hours(uuid, jsonb) to authenticated;
grant execute on function public.replace_place_tags(uuid, uuid[]) to authenticated;
