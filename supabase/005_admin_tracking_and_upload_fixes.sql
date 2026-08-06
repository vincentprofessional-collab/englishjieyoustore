-- 修复后台统计写入权限，并确保后台图片可本地上传。

alter table if exists public.site_activity_sessions enable row level security;
alter table if exists public.site_activity_events enable row level security;

alter table if exists public.site_activity_sessions
  add column if not exists ip_hash text,
  add column if not exists visitor_key text;

alter table if exists public.site_activity_events
  add column if not exists ip_hash text,
  add column if not exists visitor_key text;

drop policy if exists "任何人记录访问会话" on public.site_activity_sessions;
drop policy if exists "任何人更新访问会话" on public.site_activity_sessions;
drop policy if exists "管理员读取访问会话" on public.site_activity_sessions;
drop policy if exists "任何人记录访问事件" on public.site_activity_events;
drop policy if exists "管理员读取访问事件" on public.site_activity_events;

create policy "任何人记录访问会话"
  on public.site_activity_sessions
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "任何人更新访问会话"
  on public.site_activity_sessions
  for update
  to anon, authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

create policy "管理员读取访问会话"
  on public.site_activity_sessions
  for select
  to authenticated
  using (public.is_admin());

create policy "任何人记录访问事件"
  on public.site_activity_events
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "管理员读取访问事件"
  on public.site_activity_events
  for select
  to authenticated
  using (public.is_admin());

grant insert, update on public.site_activity_sessions to anon, authenticated;
grant insert on public.site_activity_events to anon, authenticated;
grant select on public.site_activity_sessions, public.site_activity_events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "公开读取图片" on storage.objects;
drop policy if exists "管理员上传图片" on storage.objects;
drop policy if exists "管理员更新图片" on storage.objects;
drop policy if exists "管理员删除图片" on storage.objects;

create policy "公开读取图片"
  on storage.objects
  for select
  to public
  using (bucket_id = 'images');

create policy "管理员上传图片"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'images' and public.is_admin());

create policy "管理员更新图片"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'images' and public.is_admin())
  with check (bucket_id = 'images' and public.is_admin());

create policy "管理员删除图片"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'images' and public.is_admin());
