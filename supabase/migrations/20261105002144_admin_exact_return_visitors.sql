-- Add exact lifetime return-visit buckets to the existing admin dashboard RPC.
-- A return visit is any session after the visitor's first session.
create or replace function public.get_admin_lifetime_audience_metrics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  with page_views as (
    select
      coalesce(nullif(event.visitor_key, ''), event.user_id::text) as visitor_id,
      (event.created_at at time zone 'Asia/Shanghai')::date as visit_date,
      nullif(event.metadata ->> 'visit_session_id', '') as visit_session_id
    from public.site_activity_events as event
    left join public.profiles as admin_profile
      on admin_profile.id = event.user_id and admin_profile.role = 'admin'
    where event.event_type = 'page_view'
      and admin_profile.id is null
      and coalesce(nullif(event.visitor_key, ''), event.user_id::text) is not null
  ),
  visits_by_day as (
    select
      visitor_id,
      visit_date,
      greatest(
        count(distinct visit_session_id),
        case when count(*) filter (where visit_session_id is null) > 0 then 1 else 0 end
      )::bigint as visits
    from page_views
    group by visitor_id, visit_date
  ),
  visits_by_visitor as (
    select visitor_id, sum(visits)::bigint as total_visits
    from visits_by_day
    group by visitor_id
  ),
  return_visit_counts as (
    select
      count(*) filter (where total_visits > 5)::bigint as visitors_over_five_visits,
      count(*) filter (where total_visits = 3)::bigint as visitors_with_two_return_visits,
      count(*) filter (where total_visits = 4)::bigint as visitors_with_three_return_visits,
      count(*) filter (where total_visits = 5)::bigint as visitors_with_four_return_visits
    from visits_by_visitor
  )
  select jsonb_build_object(
    'registered_users_total', (
      select count(*)::bigint
      from public.profiles as profile
      where coalesce(profile.role, '') <> 'admin'
    ),
    'visitors_total', (select count(distinct visitor_id)::bigint from page_views),
    'visitors_over_five_visits', return_visit_counts.visitors_over_five_visits,
    'visitors_with_two_return_visits', return_visit_counts.visitors_with_two_return_visits,
    'visitors_with_three_return_visits', return_visit_counts.visitors_with_three_return_visits,
    'visitors_with_four_return_visits', return_visit_counts.visitors_with_four_return_visits
  ) into result
  from return_visit_counts;

  return result;
end;
$$;

revoke all on function public.get_admin_lifetime_audience_metrics() from public, anon, authenticated;
grant execute on function public.get_admin_lifetime_audience_metrics() to authenticated;

-- Keep the admin dashboard on its existing single RPC request.
create or replace function public.get_admin_dashboard_with_lifetime(p_days integer default 1)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  dashboard jsonb;
begin
  dashboard := public.get_admin_dashboard_snapshot(p_days);
  return dashboard || jsonb_build_object(
    'lifetime_audience', public.get_admin_lifetime_audience_metrics()
  );
end;
$$;

revoke all on function public.get_admin_dashboard_with_lifetime(integer) from public, anon, authenticated;
grant execute on function public.get_admin_dashboard_with_lifetime(integer) to authenticated;
