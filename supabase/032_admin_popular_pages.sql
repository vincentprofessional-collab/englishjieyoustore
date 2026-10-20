-- Small, on-demand summary for the admin analytics page.
-- Counts anonymous and registered page views in the requested window and returns at most 20 paths.
create or replace function public.get_admin_popular_pages(
  p_since timestamptz default now() - interval '7 days',
  p_limit integer default 20
)
returns table(path text, views bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    coalesce(nullif(split_part(event.path, '?', 1), ''), '未知页面') as path,
    count(*)::bigint as views
  from public.site_activity_events event
  where event.event_type = 'page_view'
    and event.created_at >= coalesce(p_since, now() - interval '7 days')
  group by coalesce(nullif(split_part(event.path, '?', 1), ''), '未知页面')
  order by count(*) desc, 1
  limit least(greatest(coalesce(p_limit, 20), 1), 20);
end;
$$;

revoke all on function public.get_admin_popular_pages(timestamptz, integer) from public;
grant execute on function public.get_admin_popular_pages(timestamptz, integer) to authenticated;
