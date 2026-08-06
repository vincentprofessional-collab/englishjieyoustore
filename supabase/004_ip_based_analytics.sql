-- 按 IP 哈希识别未注册访客；不保存原始 IP。

alter table site_activity_sessions
  add column if not exists ip_hash text,
  add column if not exists visitor_key text;

alter table site_activity_events
  add column if not exists ip_hash text,
  add column if not exists visitor_key text;

create index if not exists idx_site_activity_sessions_visitor
  on site_activity_sessions(visitor_key, last_seen_at desc);
create index if not exists idx_site_activity_sessions_ip_hash
  on site_activity_sessions(ip_hash, last_seen_at desc);
create index if not exists idx_site_activity_events_visitor
  on site_activity_events(visitor_key, created_at desc);
create index if not exists idx_site_activity_events_ip_hash
  on site_activity_events(ip_hash, created_at desc);

create or replace function get_admin_anonymous_visitor_metrics()
returns table (
  anonymous_visitors_total bigint,
  anonymous_visitors_today bigint,
  anonymous_visitors_week bigint,
  anonymous_page_views_total bigint,
  anonymous_page_views_today bigint
)
language sql security definer set search_path = public
as $$
  select
    count(distinct coalesce(visitor_key, id)) filter (where user_id is null) as anonymous_visitors_total,
    count(distinct coalesce(visitor_key, id)) filter (
      where user_id is null and last_seen_at >= date_trunc('day', now())
    ) as anonymous_visitors_today,
    count(distinct coalesce(visitor_key, id)) filter (
      where user_id is null and last_seen_at >= now() - interval '7 days'
    ) as anonymous_visitors_week,
    (
      select count(*)
      from site_activity_events
      where user_id is null and event_type = 'page_view'
    ) as anonymous_page_views_total,
    (
      select count(*)
      from site_activity_events
      where user_id is null
        and event_type = 'page_view'
        and created_at >= date_trunc('day', now())
    ) as anonymous_page_views_today
  from site_activity_sessions
  where is_admin();
$$;

grant execute on function get_admin_anonymous_visitor_metrics() to authenticated;
