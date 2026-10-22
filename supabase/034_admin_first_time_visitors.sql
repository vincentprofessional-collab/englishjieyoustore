-- Add today's first-time anonymous visitors to the on-demand admin snapshot.
create or replace function public.get_admin_dashboard_snapshot(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  days_back integer := least(greatest(coalesce(p_days, 7), 1), 31);
  today date := (now() at time zone 'Asia/Shanghai')::date;
  first_day date := today - (days_back - 1);
  first_instant timestamptz := first_day::timestamp at time zone 'Asia/Shanghai';
  tomorrow_instant timestamptz := (today + 1)::timestamp at time zone 'Asia/Shanghai';
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  with dates as (
    select generate_series(first_day::timestamp, today::timestamp, interval '1 day')::date as visit_date
  ),
  page_views as materialized (
    select
      event.id,
      event.created_at,
      event.user_id,
      event.visitor_key,
      event.path,
      event.page_title,
      event.metadata,
      (event.created_at at time zone 'Asia/Shanghai')::date as visit_date
    from public.site_activity_events event
    left join public.profiles admin_profile
      on admin_profile.id = event.user_id and admin_profile.role = 'admin'
    where event.event_type = 'page_view'
      and event.created_at >= least(first_instant, now() - interval '7 days')
      and event.created_at < tomorrow_instant
      and admin_profile.id is null
  ),
  registered_daily as (
    select page_views.visit_date, count(distinct page_views.user_id)::bigint as visitors
    from page_views
    where page_views.visit_date >= first_day
      and page_views.user_id is not null
    group by page_views.visit_date
  ),
  visitor_days as (
    select
      page_views.visit_date,
      page_views.visitor_key,
      bool_or(page_views.user_id is not null) as has_registered_visit,
      bool_or(page_views.user_id is null) as has_anonymous_visit,
      bool_or(page_views.metadata ->> 'returning_visitor' = 'true') as client_knows_returning
    from page_views
    where page_views.visit_date >= first_day
      and nullif(page_views.visitor_key, '') is not null
    group by page_views.visit_date, page_views.visitor_key
  ),
  anonymous_returning_daily as (
    select visitor_days.visit_date, count(*)::bigint as visitors
    from visitor_days
    where visitor_days.has_anonymous_visit
      and not visitor_days.has_registered_visit
      and (
        visitor_days.client_knows_returning
        or exists (
          select 1
          from public.site_activity_events previous
          left join public.profiles previous_admin
            on previous_admin.id = previous.user_id and previous_admin.role = 'admin'
          where previous.event_type = 'page_view'
            and previous.visitor_key = visitor_days.visitor_key
            and previous.created_at < (visitor_days.visit_date::timestamp at time zone 'Asia/Shanghai')
            and previous_admin.id is null
        )
      )
    group by visitor_days.visit_date
  ),
  first_time_visitors_daily as (
    select visitor_days.visit_date, count(*)::bigint as visitors
    from visitor_days
    where visitor_days.has_anonymous_visit
      and not visitor_days.has_registered_visit
      and not coalesce(visitor_days.client_knows_returning, false)
      and not exists (
        select 1
        from public.site_activity_events previous
        left join public.profiles previous_admin
          on previous_admin.id = previous.user_id and previous_admin.role = 'admin'
        where previous.event_type = 'page_view'
          and previous.visitor_key = visitor_days.visitor_key
          and previous.created_at < (visitor_days.visit_date::timestamp at time zone 'Asia/Shanghai')
          and previous_admin.id is null
      )
    group by visitor_days.visit_date
  ),
  registrations_daily as (
    select (profile.created_at at time zone 'Asia/Shanghai')::date as visit_date,
      count(*)::bigint as registrations
    from public.profiles profile
    where profile.role <> 'admin'
      and profile.created_at >= first_instant
      and profile.created_at < tomorrow_instant
    group by (profile.created_at at time zone 'Asia/Shanghai')::date
  ),
  daily_snapshot as (
    select
      dates.visit_date,
      coalesce(registered_daily.visitors, 0) as registered_visitors,
      coalesce(anonymous_returning_daily.visitors, 0) as returning_anonymous_visitors,
      coalesce(first_time_visitors_daily.visitors, 0) as first_time_visitors,
      coalesce(registrations_daily.registrations, 0) as registrations
    from dates
    left join registered_daily using (visit_date)
    left join anonymous_returning_daily using (visit_date)
    left join first_time_visitors_daily using (visit_date)
    left join registrations_daily using (visit_date)
  ),
  page_stats as (
    select
      coalesce(nullif(split_part(page_views.path, '?', 1), ''), '未知页面') as path,
      count(*)::bigint as views
    from page_views
    where page_views.created_at >= now() - interval '7 days'
    group by coalesce(nullif(split_part(page_views.path, '?', 1), ''), '未知页面')
  )
  select jsonb_build_object(
    'daily_visitors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', daily_snapshot.visit_date,
        'registered_visitors', daily_snapshot.registered_visitors,
        'returning_anonymous_visitors', daily_snapshot.returning_anonymous_visitors,
        'first_time_visitors', daily_snapshot.first_time_visitors,
        'registrations', daily_snapshot.registrations
      ) order by daily_snapshot.visit_date desc)
      from daily_snapshot
    ), '[]'::jsonb),
    'popular_pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', popular.path, 'views', popular.views) order by popular.views desc, popular.path)
      from (
        select path, views from page_stats order by views desc, path limit 20
      ) popular
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_admin_dashboard_snapshot(integer) from public, anon;
grant execute on function public.get_admin_dashboard_snapshot(integer) to authenticated;
