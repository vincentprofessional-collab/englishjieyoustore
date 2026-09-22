-- ============================================================
-- Project-scoped paid access
-- - each project can be granted separately
-- - monthly / quarterly / yearly / lifetime plans share the same entitlement table
-- - registered users no longer receive an automatic 7-day trial
-- - profiles.membership_status = 'paid' is no longer treated as global access
-- ============================================================

create table if not exists access_projects (
  project_key text primary key,
  title       text not null,
  description text,
  is_enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into access_projects (project_key, title, description, sort_order)
values
  ('vocabulary.etymology', '查单词 · 词源词根', '词源故事、词根词缀和词源目录。', 10),
  ('speaking', '雅思口语', '雅思口语高分思路、万能句型、范文、翻译和音频。', 20),
  ('writing', '雅思写作', '雅思写作审题、段落规划、逐句练习和完整范文。', 30),
  ('bbc', '《BBC随身英语》', null, 40)
on conflict (project_key) do update
set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_enabled = true,
  updated_at = now();

create table if not exists user_project_entitlements (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  project_key text not null references access_projects(project_key) on delete cascade,
  plan        text not null check (plan in ('monthly', 'quarterly', 'yearly', 'lifetime')),
  status      text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_user_project_entitlements_user
  on user_project_entitlements(user_id, project_key, status, expires_at desc);

create index if not exists idx_user_project_entitlements_project
  on user_project_entitlements(project_key, status, expires_at desc);

insert into feature_access_rules (feature_key, module, title, description, access_level, sort_order)
values
  ('vocabulary.etymology', 'vocabulary', '词源词根', '词源故事、词根词缀和词源目录；前三个免费', 'paid', 66)
on conflict (feature_key) do update
set
  module = excluded.module,
  title = excluded.title,
  description = excluded.description,
  access_level = excluded.access_level,
  sort_order = excluded.sort_order,
  updated_at = now();

update feature_access_rules
set
  access_level = 'paid',
  title = 'BBC随身英语',
  description = null,
  updated_at = now()
where feature_key = 'articles.foreign_article';

alter table access_projects enable row level security;
alter table user_project_entitlements enable row level security;

drop policy if exists "项目配置公开可读" on access_projects;
create policy "项目配置公开可读" on access_projects
  for select using (is_enabled or public.is_admin());

drop policy if exists "项目权限本人和管理员可读" on user_project_entitlements;
create policy "项目权限本人和管理员可读" on user_project_entitlements
  for select using (user_id = auth.uid() or public.is_admin());

create or replace function project_access_duration(_plan text)
returns interval
language sql immutable
as $$
  select case _plan
    when 'monthly' then interval '1 month'
    when 'quarterly' then interval '3 months'
    when 'yearly' then interval '1 year'
    when 'lifetime' then interval '0 seconds'
    else null
  end;
$$;

create or replace function has_active_membership()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or membership_status = 'lifetime'
      )
  );
$$;

create or replace function has_active_project_access(_project_key text)
returns boolean
language sql security definer set search_path = public
as $$
  select
    public.has_active_membership()
    or exists (
      select 1
      from user_project_entitlements entitlement
      join access_projects project on project.project_key = entitlement.project_key
      where entitlement.user_id = auth.uid()
        and entitlement.project_key = _project_key
        and entitlement.status = 'active'
        and entitlement.starts_at <= now()
        and entitlement.expires_at > now()
        and project.is_enabled
    );
$$;

create or replace function can_access_project(_project_key text)
returns boolean
language sql security definer set search_path = public
as $$
  select public.has_active_project_access(_project_key);
$$;

create or replace function can_access_project_item(
  _project_key text,
  _item_index int,
  _free_limit int default 3
)
returns boolean
language sql security definer set search_path = public
as $$
  select
    (
      coalesce(_item_index, -1) >= 0
      and coalesce(_item_index, -1) < greatest(coalesce(_free_limit, 0), 0)
    )
    or public.has_active_project_access(_project_key);
$$;

create or replace function feature_project_key(_feature_key text, _module text)
returns text
language sql immutable
as $$
  select case
    when _feature_key = 'vocabulary.etymology' then 'vocabulary.etymology'
    when _module = 'speaking' then 'speaking'
    when _module in ('writing', 'training') then 'writing'
    when _module = 'articles' then 'bbc'
    else null
  end;
$$;

create or replace function can_access_feature(_feature_key text)
returns boolean
language sql security definer set search_path = public
as $$
  select coalesce((
    select
      rule.is_enabled
      and (
        rule.access_level = 'free'
        or public.has_active_membership()
        or (
          public.feature_project_key(rule.feature_key, rule.module) is not null
          and public.has_active_project_access(public.feature_project_key(rule.feature_key, rule.module))
        )
      )
    from feature_access_rules rule
    where rule.feature_key = _feature_key
  ), false);
$$;

create or replace function can_access_paid_content(
  _is_paid_only boolean,
  _feature_key text default null
)
returns boolean
language sql security definer set search_path = public
as $$
  select
    (
      not coalesce(_is_paid_only, false)
      or public.has_active_membership()
      or (_feature_key is not null and public.can_access_feature(_feature_key))
    )
    and (
      _feature_key is null
      or public.can_access_feature(_feature_key)
    );
$$;

create or replace function grant_project_access(
  _user_id uuid,
  _project_key text,
  _plan text
)
returns user_project_entitlements
language plpgsql security definer set search_path = public
as $$
declare
  duration interval;
  base_expires_at timestamptz;
  entitlement user_project_entitlements;
begin
  if not public.is_admin() then
    raise exception 'Only admins can grant project access.';
  end if;

  duration := public.project_access_duration(_plan);

  if duration is null then
    raise exception 'Invalid access plan: %', _plan;
  end if;

  if not exists (select 1 from profiles where id = _user_id) then
    raise exception 'Profile does not exist: %', _user_id;
  end if;

  if not exists (select 1 from access_projects where project_key = _project_key and is_enabled) then
    raise exception 'Project is not enabled: %', _project_key;
  end if;

  select greatest(now(), coalesce(max(expires_at), now()))
  into base_expires_at
  from user_project_entitlements
  where user_id = _user_id
    and project_key = _project_key
    and status = 'active'
    and expires_at > now();

  insert into user_project_entitlements (
    user_id,
    project_key,
    plan,
    status,
    starts_at,
    expires_at
  )
  values (
    _user_id,
    _project_key,
    _plan,
    'active',
    now(),
    case
      when _plan = 'lifetime' then 'infinity'::timestamptz
      else base_expires_at + duration
    end
  )
  returning * into entitlement;

  return entitlement;
end;
$$;

create or replace function cancel_project_access(_entitlement_id uuid)
returns user_project_entitlements
language plpgsql security definer set search_path = public
as $$
declare
  entitlement user_project_entitlements;
begin
  if not public.is_admin() then
    raise exception 'Only admins can cancel project access.';
  end if;

  update user_project_entitlements
  set
    status = 'canceled',
    expires_at = least(expires_at, now()),
    updated_at = now()
  where id = _entitlement_id
  returning * into entitlement;

  if entitlement.id is null then
    raise exception 'Entitlement does not exist: %', _entitlement_id;
  end if;

  return entitlement;
end;
$$;
