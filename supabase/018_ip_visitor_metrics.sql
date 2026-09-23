-- 按今日去重 IP 区分首次访问与历史回访；只返回统计数量，不返回 IP 或邮箱。

create or replace function get_admin_ip_visitor_metrics()
returns table (
  visitors_today bigint,
  first_time_visitors_today bigint,
  returning_visitors_today bigint,
  returning_registered_visitors_today bigint,
  returning_anonymous_visitors_today bigint
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select (
      date_trunc('day', now() at time zone 'Asia/Shanghai')
      at time zone 'Asia/Shanghai'
    ) as today_start
  ),
  page_views as (
    select
      coalesce(ip_hash, visitor_key) as ip_key,
      created_at,
      user_id
    from site_activity_events
    where event_type = 'page_view'
      and coalesce(ip_hash, visitor_key) is not null
  ),
  first_seen as (
    select ip_key, min(created_at) as first_seen_at
    from page_views
    group by ip_key
  ),
  today_visitors as (
    select
      page_views.ip_key,
      first_seen.first_seen_at,
      bool_or(page_views.user_id is not null) as has_registered_visit
    from page_views
    join first_seen using (ip_key)
    cross join bounds
    where page_views.created_at >= bounds.today_start
    group by page_views.ip_key, first_seen.first_seen_at
  )
  select
    count(*) as visitors_today,
    count(*) filter (where first_seen_at >= bounds.today_start) as first_time_visitors_today,
    count(*) filter (where first_seen_at < bounds.today_start) as returning_visitors_today,
    count(*) filter (
      where first_seen_at < bounds.today_start and has_registered_visit
    ) as returning_registered_visitors_today,
    count(*) filter (
      where first_seen_at < bounds.today_start and not has_registered_visit
    ) as returning_anonymous_visitors_today
  from today_visitors
  cross join bounds
  where is_admin();
$$;

grant execute on function get_admin_ip_visitor_metrics() to authenticated;
