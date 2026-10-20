-- Database-side summaries and bounded admin detail pages.
-- This migration is intentionally local until the user approves a production release.

create or replace function public.get_admin_analytics_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  today_start timestamptz := ((now() at time zone 'Asia/Shanghai')::date::timestamp at time zone 'Asia/Shanghai');
  tomorrow_start timestamptz := (((now() at time zone 'Asia/Shanghai')::date + 1)::timestamp at time zone 'Asia/Shanghai');
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  with today_events as materialized (
    select event.id, event.user_id, event.event_type
    from public.site_activity_events event
    left join public.profiles admin_profile
      on admin_profile.id = event.user_id and admin_profile.role = 'admin'
    where event.created_at >= today_start
      and event.created_at < tomorrow_start
      and admin_profile.id is null
  ),
  today_profiles as (
    select count(*)::bigint as registered_today
    from public.profiles profile
    where profile.role <> 'admin'
      and profile.created_at >= today_start
      and profile.created_at < tomorrow_start
  ),
  today_activity as (
    select
      count(*) filter (where event_type = 'page_view')::bigint as page_views_today,
      count(distinct user_id) filter (where event_type = 'login' and user_id is not null)::bigint as login_users_today,
      count(distinct user_id) filter (
        where event_type = 'login'
          and user_id is not null
          and exists (
            select 1 from public.profiles profile
            where profile.id = today_events.user_id
              and profile.role <> 'admin'
              and profile.created_at < today_start
          )
      )::bigint as registered_logins_today,
      count(distinct user_id) filter (where event_type = 'page_view' and user_id is not null)::bigint as registered_accounts_today
    from today_events
  ),
  active_sessions as (
    select count(*)::bigint as active_now
    from public.site_activity_sessions session
    left join public.profiles admin_profile
      on admin_profile.id = session.user_id and admin_profile.role = 'admin'
    where session.last_seen_at >= now() - interval '5 minutes'
      and admin_profile.id is null
  )
  select jsonb_build_object(
    'profile_count', (select count(*)::bigint from public.profiles where role <> 'admin'),
    'registered_today', (select registered_today from today_profiles),
    'page_views_today', (select page_views_today from today_activity),
    'login_users_today', (select login_users_today from today_activity),
    'registered_logins_today', (select registered_logins_today from today_activity),
    'registered_accounts_today', (select registered_accounts_today from today_activity),
    'active_now', (select active_now from active_sessions)
  ) into result;

  return result;
end;
$$;

create or replace function public.get_admin_analytics_history()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  today_start timestamptz := ((now() at time zone 'Asia/Shanghai')::date::timestamp at time zone 'Asia/Shanghai');
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  with admin_users as materialized (
    select id from public.profiles where role = 'admin'
  ),
  page_views as materialized (
    select
      coalesce(nullif(event.ip_hash, ''), nullif(event.visitor_key, ''), nullif(event.session_id, ''), event.id::text) as visitor_key,
      event.created_at,
      event.user_id,
      event.path,
      event.page_title,
      event.session_id
    from public.site_activity_events event
    left join admin_users admin_profile on admin_profile.id = event.user_id
    where event.event_type = 'page_view'
      and admin_profile.id is null
  ),
  first_seen as (
    select visitor_key, min(created_at) as first_seen_at
    from page_views
    group by visitor_key
  ),
  today_visitors as (
    select
      page_views.visitor_key,
      first_seen.first_seen_at,
      bool_or(page_views.user_id is not null) as has_registered_visit
    from page_views
    join first_seen using (visitor_key)
    where page_views.created_at >= today_start
    group by page_views.visitor_key, first_seen.first_seen_at
  ),
  pageview_counts as (
    select session_id, count(*)::bigint as page_view_count
    from page_views
    where session_id is not null
    group by session_id
  ),
  sessions as materialized (
    select
      session.id,
      session.user_id,
      coalesce(nullif(session.ip_hash, ''), nullif(session.visitor_key, ''), session.id) as visitor_key,
      session.duration_seconds,
      case when coalesce(pageview_counts.page_view_count, 0) > 0
        then pageview_counts.page_view_count else session.page_view_count end as page_view_count
    from public.site_activity_sessions session
    left join admin_users admin_profile on admin_profile.id = session.user_id
    left join pageview_counts on pageview_counts.session_id = session.id
    where admin_profile.id is null
  ),
  page_stats as (
    select
      coalesce(nullif(path, ''), '未知页面') as path,
      (array_agg(coalesce(nullif(btrim(page_title), ''), nullif(path, ''), '未知页面') order by created_at desc))[1] as title,
      count(*)::bigint as views
    from page_views
    where created_at >= now() - interval '7 days'
    group by coalesce(nullif(path, ''), '未知页面')
  ),
  visit_summary as (
    select
      count(*)::bigint as visitors_today,
      count(*) filter (where first_seen_at >= today_start)::bigint as first_time_visitors_today,
      count(*) filter (where first_seen_at < today_start)::bigint as returning_visitors_today,
      count(*) filter (where first_seen_at < today_start and has_registered_visit)::bigint as returning_registered_visitors_today,
      count(*) filter (where first_seen_at < today_start and not has_registered_visit)::bigint as returning_anonymous_visitors_today
    from today_visitors
  ),
  session_summary as (
    select
      avg(nullif(duration_seconds, 0)) as average_duration,
      avg(nullif(page_view_count, 0)) as average_page_views,
      avg(nullif(duration_seconds, 0)) filter (where user_id is not null) as registered_average_duration,
      avg(nullif(page_view_count, 0)) filter (where user_id is not null) as registered_average_page_views,
      avg(nullif(duration_seconds, 0)) filter (where user_id is null) as anonymous_average_duration,
      avg(nullif(page_view_count, 0)) filter (where user_id is null) as anonymous_average_page_views
    from sessions
  )
  select jsonb_build_object(
    'anonymous_session_count', (
      select count(distinct visitor_key)::bigint from sessions where user_id is null
    ),
    'anonymous_page_view_count', (select count(*)::bigint from page_views where user_id is null),
    'visitors_today', (select visitors_today from visit_summary),
    'first_time_visitors_today', (select first_time_visitors_today from visit_summary),
    'returning_visitors_today', (select returning_visitors_today from visit_summary),
    'returning_registered_visitors_today', (select returning_registered_visitors_today from visit_summary),
    'returning_anonymous_visitors_today', (select returning_anonymous_visitors_today from visit_summary),
    'average_duration', coalesce((select average_duration from session_summary), 0),
    'registered_average_duration', coalesce((select registered_average_duration from session_summary), 0),
    'registered_average_page_views', coalesce((select registered_average_page_views from session_summary), 0),
    'anonymous_average_duration', coalesce((select anonymous_average_duration from session_summary), 0),
    'anonymous_average_page_views', coalesce((select anonymous_average_page_views from session_summary), 0),
    'popular_pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'title', title, 'views', views) order by views desc, path)
      from (select path, title, views from page_stats order by views desc, path limit 8) popular
    ), '[]'::jsonb),
    'model_answer_page', (
      select jsonb_build_object('path', path, 'title', title, 'views', views)
      from page_stats
      where split_part(path, '?', 1) ~ '^/(speaking|writing)(/|$)'
        and split_part(path, '?', 1) not like '%/practice%'
        and split_part(path, '?', 1) not like '%/mock%'
      order by views desc, path
      limit 1
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.get_admin_analytics_page(
  p_kind text,
  p_offset integer default 0,
  p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  page_offset integer := greatest(coalesce(p_offset, 0), 0);
  page_limit integer := least(greatest(coalesce(p_limit, 10), 1), 20);
  total_rows bigint;
  page_items jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if p_kind = 'profiles' then
    select count(*) into total_rows from public.profiles where role <> 'admin';
    select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb) into page_items
    from (
      select id, email, display_name, membership_status, created_at
      from public.profiles
      where role <> 'admin'
      order by created_at desc nulls last, id
      offset page_offset limit page_limit
    ) row_data;
  elsif p_kind in ('sessions', 'anonymous_sessions') then
    select count(*) into total_rows
    from public.site_activity_sessions session
    left join public.profiles admin_profile
      on admin_profile.id = session.user_id and admin_profile.role = 'admin'
    where admin_profile.id is null
      and (p_kind = 'sessions' or session.user_id is null);
    select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb) into page_items
    from (
      select
        session.id,
        session.user_id,
        coalesce(nullif(profile.email, ''), nullif(profile.display_name, ''), session.user_id::text, '匿名访问') as account,
        session.last_seen_at,
        session.duration_seconds,
        session.first_path,
        session.last_path,
        session.page_view_count
      from public.site_activity_sessions session
      left join public.profiles profile on profile.id = session.user_id
      where (p_kind = 'sessions' or session.user_id is null)
        and not exists (select 1 from public.profiles admin_profile where admin_profile.id = session.user_id and admin_profile.role = 'admin')
      order by session.last_seen_at desc nulls last, session.id
      offset page_offset limit page_limit
    ) row_data;
  elsif p_kind = 'logins' then
    select count(*) into total_rows
    from public.site_activity_events event
    where event.event_type = 'login'
      and not exists (select 1 from public.profiles admin_profile where admin_profile.id = event.user_id and admin_profile.role = 'admin');
    select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb) into page_items
    from (
      select
        event.id,
        event.user_id,
        coalesce(nullif(profile.email, ''), nullif(profile.display_name, ''), event.user_id::text, '未知用户') as account,
        event.path,
        event.created_at
      from public.site_activity_events event
      left join public.profiles profile on profile.id = event.user_id
      where event.event_type = 'login'
        and not exists (select 1 from public.profiles admin_profile where admin_profile.id = event.user_id and admin_profile.role = 'admin')
      order by event.created_at desc, event.id
      offset page_offset limit page_limit
    ) row_data;
  else
    raise exception 'unsupported analytics page kind' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'items', coalesce(page_items, '[]'::jsonb),
    'total', coalesce(total_rows, 0),
    'offset', page_offset,
    'limit', page_limit,
    'has_more', page_offset + jsonb_array_length(coalesce(page_items, '[]'::jsonb)) < coalesce(total_rows, 0)
  );
end;
$$;

create or replace function public.get_admin_membership_sales_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  with active_qualifications as materialized (
    select distinct on (entitlement.user_id, entitlement.project_key)
      entitlement.id, entitlement.user_id, entitlement.project_key, entitlement.plan, entitlement.starts_at
    from public.user_project_entitlements entitlement
    where entitlement.status = 'active'
      and entitlement.starts_at <= now()
      and entitlement.expires_at > now()
    order by entitlement.user_id, entitlement.project_key, entitlement.starts_at desc, entitlement.id
  ),
  confirmed_orders as materialized (
    select fulfilled_at, amount_cny
    from public.project_payment_requests
    where status = 'fulfilled'
      and fulfilled_at is not null
      and fulfilled_at <= now()
      and amount_cny >= 0
  ),
  local_clock as (
    select (now() at time zone 'Asia/Shanghai') as local_now,
      (now() at time zone 'Asia/Shanghai')::date as local_today
  ),
  day_series as (
    select (local_clock.local_today - days_back)::date as period_start
    from local_clock cross join generate_series(29, 0, -1) days_back
  ),
  month_series as (
    select (date_trunc('month', local_clock.local_now)::date - make_interval(months => months_back))::date as period_start
    from local_clock cross join generate_series(11, 0, -1) months_back
  ),
  quarter_series as (
    select (
      make_date(
        extract(year from local_clock.local_now)::integer,
        (((extract(month from local_clock.local_now)::integer - 1) / 3) * 3 + 1),
        1
      ) - make_interval(months => quarters_back * 3)
    )::date as period_start
    from local_clock cross join generate_series(7, 0, -1) quarters_back
  ),
  year_series as (
    select (make_date(extract(year from local_clock.local_now)::integer, 1, 1) - make_interval(years => years_back))::date as period_start
    from local_clock cross join generate_series(4, 0, -1) years_back
  ),
  day_totals as (
    select series.period_start, coalesce(sum(order_row.amount_cny), 0)::numeric as amount_cny
    from day_series series
    left join confirmed_orders order_row
      on (order_row.fulfilled_at at time zone 'Asia/Shanghai')::date = series.period_start
    group by series.period_start
  ),
  month_totals as (
    select series.period_start, coalesce(sum(order_row.amount_cny), 0)::numeric as amount_cny
    from month_series series
    left join confirmed_orders order_row
      on date_trunc('month', order_row.fulfilled_at at time zone 'Asia/Shanghai')::date = series.period_start
    group by series.period_start
  ),
  quarter_totals as (
    select series.period_start, coalesce(sum(order_row.amount_cny), 0)::numeric as amount_cny
    from quarter_series series
    left join confirmed_orders order_row
      on date_trunc('quarter', order_row.fulfilled_at at time zone 'Asia/Shanghai')::date = series.period_start
    group by series.period_start
  ),
  year_totals as (
    select series.period_start, coalesce(sum(order_row.amount_cny), 0)::numeric as amount_cny
    from year_series series
    left join confirmed_orders order_row
      on date_trunc('year', order_row.fulfilled_at at time zone 'Asia/Shanghai')::date = series.period_start
    group by series.period_start
  ),
  project_counts as (
    select qualification.project_key, count(*)::bigint as members, coalesce(project.title, qualification.project_key) as title
    from active_qualifications qualification
    left join public.access_projects project on project.project_key = qualification.project_key
    group by qualification.project_key, project.title
  )
  select jsonb_build_object(
    'total_members', (select count(distinct user_id)::bigint from active_qualifications),
    'total_qualifications', (select count(*)::bigint from active_qualifications),
    'total_sales_cny', round(coalesce((select sum(amount_cny) from confirmed_orders), 0), 2),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object('key', project_key, 'title', title, 'members', members) order by title)
      from project_counts
    ), '[]'::jsonb),
    'series', jsonb_build_object(
      'day', (select jsonb_agg(jsonb_build_object('label', to_char(period_start, 'YYYY-MM-DD'), 'amount_cny', round(amount_cny, 2)) order by period_start) from day_totals),
      'month', (select jsonb_agg(jsonb_build_object('label', to_char(period_start, 'YYYY-MM'), 'amount_cny', round(amount_cny, 2)) order by period_start) from month_totals),
      'quarter', (select jsonb_agg(jsonb_build_object('label', to_char(period_start, 'YYYY') || '-Q' || extract(quarter from period_start)::integer::text, 'amount_cny', round(amount_cny, 2)) order by period_start) from quarter_totals),
      'year', (select jsonb_agg(jsonb_build_object('label', to_char(period_start, 'YYYY'), 'amount_cny', round(amount_cny, 2)) order by period_start) from year_totals)
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.get_admin_membership_sales_page(
  p_offset integer default 0,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  page_offset integer := greatest(coalesce(p_offset, 0), 0);
  page_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  with active_qualifications as materialized (
    select distinct on (entitlement.user_id, entitlement.project_key)
      entitlement.id, entitlement.user_id, entitlement.project_key, entitlement.plan, entitlement.starts_at, entitlement.expires_at
    from public.user_project_entitlements entitlement
    where entitlement.status = 'active'
      and entitlement.starts_at <= now()
      and entitlement.expires_at > now()
    order by entitlement.user_id, entitlement.project_key, entitlement.starts_at desc, entitlement.id
  ),
  page_rows as (
    select
      qualification.id,
      coalesce(nullif(profile.email, ''), nullif(profile.display_name, ''), '已注册用户') as account,
      coalesce(project.title, qualification.project_key) as project,
      case qualification.plan
        when 'monthly' then '月卡会员'
        when 'quarterly' then '季卡会员'
        when 'yearly' then '年卡会员'
        when 'lifetime' then '终身会员'
        else qualification.plan
      end as plan,
      payment.amount_cny as price_cny,
      payment.fulfilled_at as purchased_at,
      qualification.expires_at,
      qualification.starts_at
    from active_qualifications qualification
    left join public.profiles profile on profile.id = qualification.user_id
    left join public.access_projects project on project.project_key = qualification.project_key
    left join lateral (
      select order_row.amount_cny, order_row.fulfilled_at
      from public.project_payment_requests order_row
      where order_row.user_id = qualification.user_id
        and order_row.project_key = qualification.project_key
        and order_row.plan = qualification.plan
        and order_row.status = 'fulfilled'
        and order_row.fulfilled_at is not null
        and order_row.fulfilled_at <= now()
        and order_row.amount_cny >= 0
      order by order_row.fulfilled_at desc, order_row.id desc
      limit 1
    ) payment on true
    order by qualification.starts_at desc, qualification.id
    offset page_offset limit page_limit
  )
  select jsonb_build_object(
    'total', (select count(*)::bigint from active_qualifications),
    'offset', page_offset,
    'limit', page_limit,
    'has_more', page_offset + page_limit < (select count(*) from active_qualifications),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'account', account,
        'project', project,
        'plan', plan,
        'price_cny', price_cny,
        'purchased_at', purchased_at,
        'expires_at', expires_at
      ) order by starts_at desc, id)
      from page_rows
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_admin_analytics_overview() from public, anon;
revoke all on function public.get_admin_analytics_history() from public, anon;
revoke all on function public.get_admin_analytics_page(text, integer, integer) from public, anon;
revoke all on function public.get_admin_membership_sales_summary() from public, anon;
revoke all on function public.get_admin_membership_sales_page(integer, integer) from public, anon;

grant execute on function public.get_admin_analytics_overview() to authenticated;
grant execute on function public.get_admin_analytics_history() to authenticated;
grant execute on function public.get_admin_analytics_page(text, integer, integer) to authenticated;
grant execute on function public.get_admin_membership_sales_summary() to authenticated;
grant execute on function public.get_admin_membership_sales_page(integer, integer) to authenticated;

notify pgrst, 'reload schema';
