create table if not exists public.learning_progress_access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> target_user_id)
);

create unique index if not exists learning_progress_one_pending_request_idx
  on public.learning_progress_access_requests (requester_id, target_user_id)
  where status = 'pending';
create index if not exists learning_progress_access_requester_idx
  on public.learning_progress_access_requests (requester_id, created_at desc);
create index if not exists learning_progress_access_target_idx
  on public.learning_progress_access_requests (target_user_id, status, created_at desc);

create table if not exists public.learning_progress_snapshots (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.learning_progress_access_requests enable row level security;
alter table public.learning_progress_snapshots enable row level security;
revoke all on public.learning_progress_access_requests from anon, authenticated;
revoke all on public.learning_progress_snapshots from anon, authenticated;

create or replace function public.search_learning_progress_users(p_query text)
returns table(user_id uuid, display_name text, member_number bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  query_text text := btrim(coalesce(p_query, ''));
begin
  if actor is null then raise exception '请先登录。' using errcode = '28000'; end if;
  if length(query_text) < 5 or position('@' in query_text) = 0 then return; end if;

  return query
    select profile.id,
      coalesce(nullif(profile.display_name, ''), '学习者')::text,
      profile.member_number
    from public.profiles profile
    where profile.id <> actor
      and (
        lower(coalesce(profile.email, '')) = lower(query_text)
      )
    order by profile.created_at
    limit 10;
end;
$$;

create or replace function public.request_learning_progress_access(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  existing public.learning_progress_access_requests%rowtype;
  created_request public.learning_progress_access_requests%rowtype;
begin
  if actor is null then raise exception '请先登录。' using errcode = '28000'; end if;
  if p_target_user_id = actor then raise exception '不能申请查看自己的学习进度。'; end if;
  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception '找不到这个用户。';
  end if;

  select * into existing
  from public.learning_progress_access_requests
  where requester_id = actor and target_user_id = p_target_user_id
    and status in ('pending', 'approved')
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object('id', existing.id, 'status', existing.status);
  end if;

  insert into public.learning_progress_access_requests (requester_id, target_user_id)
  values (actor, p_target_user_id)
  on conflict (requester_id, target_user_id) where status = 'pending' do nothing
  returning * into created_request;

  if created_request.id is null then
    select * into created_request
    from public.learning_progress_access_requests
    where requester_id = actor and target_user_id = p_target_user_id and status = 'pending'
    order by created_at desc limit 1;
  end if;
  return jsonb_build_object('id', created_request.id, 'status', created_request.status);
end;
$$;

create or replace function public.respond_learning_progress_access(
  p_request_id uuid,
  p_decision text,
  p_snapshot jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  access_request public.learning_progress_access_requests%rowtype;
begin
  if actor is null then raise exception '请先登录。' using errcode = '28000'; end if;
  if p_decision not in ('approved', 'declined') then raise exception '授权操作无效。'; end if;
  if p_decision = 'approved' and (p_snapshot is null or jsonb_typeof(p_snapshot) is distinct from 'object' or octet_length(p_snapshot::text) > 200000) then
    raise exception '学习进度快照格式无效或过大。';
  end if;

  update public.learning_progress_access_requests
  set status = p_decision, responded_at = now()
  where id = p_request_id and target_user_id = actor and status = 'pending'
  returning * into access_request;
  if access_request.id is null then raise exception '申请已处理或不属于当前账号。'; end if;

  if p_decision = 'approved' then
    insert into public.learning_progress_snapshots (user_id, snapshot, updated_at)
    values (actor, p_snapshot, now())
    on conflict (user_id) do update set snapshot = excluded.snapshot, updated_at = excluded.updated_at;
  end if;
  return jsonb_build_object('id', access_request.id, 'status', access_request.status);
end;
$$;

create or replace function public.get_my_learning_progress_sharing()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception '请先登录。' using errcode = '28000'; end if;
  return jsonb_build_object(
    'pendingIncoming', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', request.id, 'userId', requester.id,
        'displayName', coalesce(nullif(requester.display_name, ''), '学习者'),
        'memberNumber', requester.member_number, 'createdAt', request.created_at
      ) order by request.created_at desc)
      from public.learning_progress_access_requests request
      join public.profiles requester on requester.id = request.requester_id
      where request.target_user_id = actor and request.status = 'pending'
    ), '[]'::jsonb),
    'pendingOutgoing', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', request.id, 'userId', target.id,
        'displayName', coalesce(nullif(target.display_name, ''), '学习者'),
        'memberNumber', target.member_number, 'createdAt', request.created_at
      ) order by request.created_at desc)
      from public.learning_progress_access_requests request
      join public.profiles target on target.id = request.target_user_id
      where request.requester_id = actor and request.status = 'pending'
    ), '[]'::jsonb),
    'approvedOutgoing', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', request.id, 'userId', target.id,
        'displayName', coalesce(nullif(target.display_name, ''), '学习者'),
        'memberNumber', target.member_number, 'createdAt', request.created_at,
        'respondedAt', request.responded_at
      ) order by request.responded_at desc nulls last)
      from public.learning_progress_access_requests request
      join public.profiles target on target.id = request.target_user_id
      where request.requester_id = actor and request.status = 'approved'
    ), '[]'::jsonb),
    'approvedIncoming', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', request.id, 'userId', requester.id,
        'displayName', coalesce(nullif(requester.display_name, ''), '学习者'),
        'memberNumber', requester.member_number, 'createdAt', request.created_at,
        'respondedAt', request.responded_at
      ) order by request.responded_at desc nulls last)
      from public.learning_progress_access_requests request
      join public.profiles requester on requester.id = request.requester_id
      where request.target_user_id = actor and request.status = 'approved'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_shared_learning_progress(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  access_request public.learning_progress_access_requests%rowtype;
  target_profile public.profiles%rowtype;
  saved_snapshot public.learning_progress_snapshots%rowtype;
  recent_logins jsonb;
begin
  if actor is null then raise exception '请先登录。' using errcode = '28000'; end if;
  select * into access_request
  from public.learning_progress_access_requests
  where id = p_request_id and requester_id = actor and status = 'approved';
  if access_request.id is null then raise exception '尚未获得该用户授权，或授权已撤回。' using errcode = '42501'; end if;
  select * into target_profile from public.profiles where id = access_request.target_user_id;
  select * into saved_snapshot from public.learning_progress_snapshots where user_id = access_request.target_user_id;
  select coalesce(jsonb_agg(login.created_at order by login.created_at desc), '[]'::jsonb)
  into recent_logins
  from (
    select created_at from public.site_activity_events
    where user_id = access_request.target_user_id and event_type = 'login'
    order by created_at desc limit 50
  ) login;
  return jsonb_build_object(
    'requestId', access_request.id,
    'userId', target_profile.id,
    'displayName', coalesce(nullif(target_profile.display_name, ''), '学习者'),
    'updatedAt', saved_snapshot.updated_at,
    'snapshot', coalesce(saved_snapshot.snapshot, '{}'::jsonb),
    'loginTimes', recent_logins
  );
end;
$$;

create or replace function public.sync_my_learning_progress_snapshot(p_snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception '请先登录。' using errcode = '28000'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) is distinct from 'object' or octet_length(p_snapshot::text) > 200000 then
    raise exception '学习进度快照格式无效或过大。';
  end if;
  if not exists (
    select 1 from public.learning_progress_access_requests
    where target_user_id = actor and status = 'approved'
  ) then
    return jsonb_build_object('saved', false, 'reason', 'no-approved-viewers');
  end if;
  insert into public.learning_progress_snapshots (user_id, snapshot, updated_at)
  values (actor, p_snapshot, now())
  on conflict (user_id) do update set snapshot = excluded.snapshot, updated_at = excluded.updated_at;
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.revoke_learning_progress_access(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  access_request public.learning_progress_access_requests%rowtype;
begin
  if actor is null then raise exception '请先登录。' using errcode = '28000'; end if;
  update public.learning_progress_access_requests
  set status = 'revoked', responded_at = now()
  where id = p_request_id and (requester_id = actor or target_user_id = actor)
    and status in ('pending', 'approved')
  returning * into access_request;
  if access_request.id is null then raise exception '找不到可撤回的授权。'; end if;
  if not exists (
    select 1 from public.learning_progress_access_requests
    where target_user_id = access_request.target_user_id and status = 'approved'
  ) then
    delete from public.learning_progress_snapshots where user_id = access_request.target_user_id;
  end if;
  return jsonb_build_object('id', access_request.id, 'status', access_request.status);
end;
$$;

revoke all on function public.search_learning_progress_users(text) from public, anon;
revoke all on function public.request_learning_progress_access(uuid) from public, anon;
revoke all on function public.respond_learning_progress_access(uuid, text, jsonb) from public, anon;
revoke all on function public.get_my_learning_progress_sharing() from public, anon;
revoke all on function public.get_shared_learning_progress(uuid) from public, anon;
revoke all on function public.sync_my_learning_progress_snapshot(jsonb) from public, anon;
revoke all on function public.revoke_learning_progress_access(uuid) from public, anon;
grant execute on function public.search_learning_progress_users(text) to authenticated;
grant execute on function public.request_learning_progress_access(uuid) to authenticated;
grant execute on function public.respond_learning_progress_access(uuid, text, jsonb) to authenticated;
grant execute on function public.get_my_learning_progress_sharing() to authenticated;
grant execute on function public.get_shared_learning_progress(uuid) to authenticated;
grant execute on function public.sync_my_learning_progress_snapshot(jsonb) to authenticated;
grant execute on function public.revoke_learning_progress_access(uuid) to authenticated;
