-- 后台访问统计：登录、注册、页面访问和停留时长。

create table if not exists site_activity_sessions (
  id               text primary key,
  user_id          uuid references profiles(id) on delete set null,
  started_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  first_path       text,
  last_path        text,
  page_view_count  int not null default 0 check (page_view_count >= 0),
  ip_hash          text,
  visitor_key      text,
  referrer         text,
  user_agent       text,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists site_activity_events (
  id               uuid primary key default uuid_generate_v4(),
  session_id       text references site_activity_sessions(id) on delete set null,
  user_id          uuid references profiles(id) on delete set null,
  ip_hash          text,
  visitor_key      text,
  event_type       text not null
                   check (event_type in ('page_view', 'login', 'logout', 'registration')),
  path             text,
  page_title       text,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  referrer         text,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

alter table site_activity_sessions
  add column if not exists ip_hash text,
  add column if not exists visitor_key text;

alter table site_activity_events
  add column if not exists ip_hash text,
  add column if not exists visitor_key text;

create index if not exists idx_site_activity_sessions_user
  on site_activity_sessions(user_id, last_seen_at desc);
create index if not exists idx_site_activity_sessions_last_seen
  on site_activity_sessions(last_seen_at desc);
create index if not exists idx_site_activity_sessions_visitor
  on site_activity_sessions(visitor_key, last_seen_at desc);
create index if not exists idx_site_activity_sessions_ip_hash
  on site_activity_sessions(ip_hash, last_seen_at desc);
create index if not exists idx_site_activity_events_type_created
  on site_activity_events(event_type, created_at desc);
create index if not exists idx_site_activity_events_path
  on site_activity_events(path, created_at desc);
create index if not exists idx_site_activity_events_user
  on site_activity_events(user_id, created_at desc);
create index if not exists idx_site_activity_events_visitor
  on site_activity_events(visitor_key, created_at desc);
create index if not exists idx_site_activity_events_ip_hash
  on site_activity_events(ip_hash, created_at desc);

alter table site_activity_sessions enable row level security;
alter table site_activity_events enable row level security;

drop policy if exists "任何人记录访问会话" on site_activity_sessions;
drop policy if exists "任何人更新访问会话" on site_activity_sessions;
drop policy if exists "管理员读取访问会话" on site_activity_sessions;
drop policy if exists "任何人记录访问事件" on site_activity_events;
drop policy if exists "管理员读取访问事件" on site_activity_events;

create policy "任何人记录访问会话"
  on site_activity_sessions for insert
  with check (user_id is null or user_id = auth.uid());

create policy "任何人更新访问会话"
  on site_activity_sessions for update
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

create policy "管理员读取访问会话"
  on site_activity_sessions for select
  using (is_admin());

create policy "任何人记录访问事件"
  on site_activity_events for insert
  with check (user_id is null or user_id = auth.uid());

create policy "管理员读取访问事件"
  on site_activity_events for select
  using (is_admin());

grant select, insert, update on site_activity_sessions to anon, authenticated;
grant select, insert on site_activity_events to anon, authenticated;
