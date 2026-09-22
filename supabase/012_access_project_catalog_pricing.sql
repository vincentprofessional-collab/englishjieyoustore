-- ============================================================
-- Admin-managed project catalog and per-project pricing
-- - project content is editable from the admin project-access page
-- - each project owns its monthly / quarterly / yearly / lifetime prices
-- - payment request amounts are always resolved on the server
-- ============================================================

alter table access_projects
  add column if not exists short_title text,
  add column if not exists gate_title text;

update access_projects
set
  short_title = coalesce(nullif(short_title, ''), title),
  updated_at = now()
where short_title is null or short_title = '';

create table if not exists access_project_plans (
  project_key   text not null references access_projects(project_key) on delete cascade,
  plan          text not null check (plan in ('monthly', 'quarterly', 'yearly', 'lifetime')),
  label         text not null,
  duration_label text not null,
  price_cny     numeric(10, 2) not null check (price_cny >= 0),
  is_enabled    boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  primary key (project_key, plan)
);

insert into access_project_plans (
  project_key,
  plan,
  label,
  duration_label,
  price_cny,
  sort_order
)
select
  project.project_key,
  plan.plan,
  plan.label,
  plan.duration_label,
  plan.price_cny,
  plan.sort_order
from access_projects project
cross join (
  values
    ('monthly', '月卡', '一个月', 9::numeric, 10),
    ('quarterly', '季卡', '三个月', 19::numeric, 20),
    ('yearly', '年卡', '一年', 69::numeric, 30),
    ('lifetime', '终身', '永久', 199::numeric, 40)
) as plan(plan, label, duration_label, price_cny, sort_order)
on conflict (project_key, plan) do nothing;

alter table access_project_plans enable row level security;

drop policy if exists "项目价格公开可读" on access_project_plans;
create policy "项目价格公开可读" on access_project_plans
  for select using (
    exists (
      select 1
      from access_projects project
      where project.project_key = access_project_plans.project_key
        and (project.is_enabled or public.is_admin())
    )
  );

drop policy if exists "管理员新增项目" on access_projects;
create policy "管理员新增项目" on access_projects
  for insert with check (public.is_admin());

drop policy if exists "管理员修改项目" on access_projects;
create policy "管理员修改项目" on access_projects
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "管理员新增项目价格" on access_project_plans;
create policy "管理员新增项目价格" on access_project_plans
  for insert with check (public.is_admin());

drop policy if exists "管理员修改项目价格" on access_project_plans;
create policy "管理员修改项目价格" on access_project_plans
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function admin_upsert_access_project(
  _project_key text,
  _title text,
  _short_title text,
  _gate_title text,
  _description text,
  _is_enabled boolean,
  _sort_order int,
  _plans jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  plan_row record;
  normalized_key text := lower(trim(coalesce(_project_key, '')));
begin
  if not public.is_admin() then
    raise exception 'Only admins can update project catalog pricing.';
  end if;

  if normalized_key = '' or normalized_key !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' then
    raise exception 'Invalid project key: %', _project_key;
  end if;

  if trim(coalesce(_title, '')) = '' then
    raise exception 'Project title is required.';
  end if;

  if coalesce(jsonb_typeof(_plans), '') <> 'array'
    or coalesce(jsonb_array_length(_plans), 0) <> 4
    or not (
      _plans @> '[{"plan":"monthly"}]'::jsonb
      and _plans @> '[{"plan":"quarterly"}]'::jsonb
      and _plans @> '[{"plan":"yearly"}]'::jsonb
      and _plans @> '[{"plan":"lifetime"}]'::jsonb
    )
  then
    raise exception 'Monthly, quarterly, yearly and lifetime plans are all required.';
  end if;

  insert into access_projects (
    project_key,
    title,
    short_title,
    gate_title,
    description,
    is_enabled,
    sort_order,
    updated_at
  )
  values (
    normalized_key,
    trim(_title),
    coalesce(nullif(trim(_short_title), ''), trim(_title)),
    nullif(trim(_gate_title), ''),
    nullif(trim(_description), ''),
    coalesce(_is_enabled, true),
    coalesce(_sort_order, 0),
    now()
  )
  on conflict (project_key) do update
  set
    title = excluded.title,
    short_title = excluded.short_title,
    gate_title = excluded.gate_title,
    description = excluded.description,
    is_enabled = excluded.is_enabled,
    sort_order = excluded.sort_order,
    updated_at = now();

  for plan_row in
    select *
    from jsonb_to_recordset(_plans) as item(
      plan text,
      label text,
      duration_label text,
      price_cny numeric,
      is_enabled boolean,
      sort_order int
    )
  loop
    if plan_row.plan not in ('monthly', 'quarterly', 'yearly', 'lifetime') then
      raise exception 'Invalid access plan: %', plan_row.plan;
    end if;

    if plan_row.price_cny is null or plan_row.price_cny < 0 then
      raise exception 'Invalid price for plan %.', plan_row.plan;
    end if;

    insert into access_project_plans (
      project_key,
      plan,
      label,
      duration_label,
      price_cny,
      is_enabled,
      sort_order,
      updated_at
    )
    values (
      normalized_key,
      plan_row.plan,
      coalesce(nullif(trim(plan_row.label), ''), plan_row.plan),
      coalesce(nullif(trim(plan_row.duration_label), ''), plan_row.plan),
      plan_row.price_cny,
      coalesce(plan_row.is_enabled, true),
      coalesce(plan_row.sort_order, 0),
      now()
    )
    on conflict (project_key, plan) do update
    set
      label = excluded.label,
      duration_label = excluded.duration_label,
      price_cny = excluded.price_cny,
      is_enabled = excluded.is_enabled,
      sort_order = excluded.sort_order,
      updated_at = now();
  end loop;
end;
$$;

create or replace function project_access_amount_cny(
  _project_key text,
  _plan text
)
returns numeric
language sql stable security definer set search_path = public
as $$
  select project_plan.price_cny
  from access_project_plans project_plan
  join access_projects project on project.project_key = project_plan.project_key
  where project_plan.project_key = _project_key
    and project_plan.plan = _plan
    and project_plan.is_enabled
    and project.is_enabled;
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

  if not exists (
    select 1
    from access_project_plans
    where project_key = _project_key
      and plan = _plan
      and is_enabled
  ) then
    raise exception 'Project plan is not enabled: % / %', _project_key, _plan;
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

create or replace function create_project_payment_request(
  _project_key text,
  _plan text
)
returns project_payment_requests
language plpgsql security definer set search_path = public
as $$
declare
  amount numeric;
  current_email text;
  next_order_no text;
  request project_payment_requests;
begin
  if auth.uid() is null then
    raise exception 'Please sign in before creating a payment request.';
  end if;

  amount := public.project_access_amount_cny(_project_key, _plan);

  if amount is null then
    raise exception 'Project plan is not available: % / %', _project_key, _plan;
  end if;

  select coalesce(nullif(email, ''), auth.jwt() ->> 'email', '')
  into current_email
  from profiles
  where id = auth.uid();

  if current_email = '' then
    raise exception 'Current user email is missing.';
  end if;

  loop
    next_order_no :=
      'JY' ||
      to_char(now(), 'YYYYMMDDHH24MISS') ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    exit when not exists (
      select 1 from project_payment_requests where order_no = next_order_no
    );
  end loop;

  insert into project_payment_requests (
    order_no,
    user_id,
    user_email,
    project_key,
    plan,
    amount_cny
  )
  values (
    next_order_no,
    auth.uid(),
    current_email,
    _project_key,
    _plan,
    amount
  )
  returning * into request;

  return request;
end;
$$;
