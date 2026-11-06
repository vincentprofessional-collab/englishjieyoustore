-- Show cumulative anonymous visitor counts for thresholds above 2, 3, 4, and 5 visits.
-- A visitor key associated with a registered-user event is excluded from all four buckets.
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
      event.user_id,
      (event.created_at at time zone 'Asia/Shanghai')::date as visit_date,
      nullif(event.metadata ->> 'visit_session_id', '') as visit_session_id
    from public.site_activity_events as event
    left join public.profiles as admin_profile
      on admin_profile.id = event.user_id and admin_profile.role = 'admin'
    where event.event_type = 'page_view'
      and admin_profile.id is null
      and coalesce(nullif(event.visitor_key, ''), event.user_id::text) is not null
  ),
  registered_visitor_ids as (
    select distinct visitor_id
    from page_views
    where user_id is not null
  ),
  anonymous_page_views as (
    select page_views.*
    from page_views
    where user_id is null
      and not exists (
        select 1
        from registered_visitor_ids
        where registered_visitor_ids.visitor_id = page_views.visitor_id
      )
  ),
  visits_by_visitor as (
    select
      visitor_id,
      (
        count(distinct visit_session_id)
        + count(distinct visit_date) filter (
          where visit_session_id is null
            and not exists (
              select 1
              from anonymous_page_views as identified_session
              where identified_session.visitor_id = anonymous_page_views.visitor_id
                and identified_session.visit_date = anonymous_page_views.visit_date
                and identified_session.visit_session_id is not null
            )
        )
      )::bigint as total_visits
    from anonymous_page_views
    group by visitor_id
  ),
  return_visit_counts as (
    select
      count(*) filter (where total_visits >= 3)::bigint as anonymous_visitors_with_3_plus_visits,
      count(*) filter (where total_visits >= 4)::bigint as anonymous_visitors_with_4_plus_visits,
      count(*) filter (where total_visits >= 5)::bigint as anonymous_visitors_with_5_plus_visits,
      count(*) filter (where total_visits >= 6)::bigint as anonymous_visitors_with_6_plus_visits
    from visits_by_visitor
  ),
  legacy_visits_by_visitor as (
    select
      visitor_id,
      (
        count(distinct visit_session_id)
        + count(distinct visit_date) filter (
          where visit_session_id is null
            and not exists (
              select 1
              from page_views as identified_session
              where identified_session.visitor_id = page_views.visitor_id
                and identified_session.visit_date = page_views.visit_date
                and identified_session.visit_session_id is not null
            )
        )
      )::bigint as total_visits
    from page_views
    group by visitor_id
  ),
  legacy_return_visit_counts as (
    select
      count(*) filter (where total_visits > 5)::bigint as visitors_over_five_visits,
      count(*) filter (where total_visits = 3)::bigint as visitors_with_two_return_visits,
      count(*) filter (where total_visits = 4)::bigint as visitors_with_three_return_visits,
      count(*) filter (where total_visits = 5)::bigint as visitors_with_four_return_visits
    from legacy_visits_by_visitor
  )
  select jsonb_build_object(
    'registered_users_total', (
      select count(*)::bigint
      from public.profiles as profile
      where coalesce(profile.role, '') <> 'admin'
    ),
    'visitors_total', (select count(distinct visitor_id)::bigint from page_views),
    'anonymous_visitors_with_3_plus_visits', return_visit_counts.anonymous_visitors_with_3_plus_visits,
    'anonymous_visitors_with_4_plus_visits', return_visit_counts.anonymous_visitors_with_4_plus_visits,
    'anonymous_visitors_with_5_plus_visits', return_visit_counts.anonymous_visitors_with_5_plus_visits,
    'anonymous_visitors_with_6_plus_visits', return_visit_counts.anonymous_visitors_with_6_plus_visits,
    'visitors_over_five_visits', legacy_return_visit_counts.visitors_over_five_visits,
    'visitors_with_two_return_visits', legacy_return_visit_counts.visitors_with_two_return_visits,
    'visitors_with_three_return_visits', legacy_return_visit_counts.visitors_with_three_return_visits,
    'visitors_with_four_return_visits', legacy_return_visit_counts.visitors_with_four_return_visits
  ) into result
  from return_visit_counts, legacy_return_visit_counts;

  return result;
end;
$$;

revoke all on function public.get_admin_lifetime_audience_metrics() from public, anon, authenticated;
grant execute on function public.get_admin_lifetime_audience_metrics() to authenticated;
