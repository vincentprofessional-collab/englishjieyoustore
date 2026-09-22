-- ============================================================
-- Project payment requests for manual WeChat QR payments
-- ============================================================

create table if not exists project_payment_requests (
  id           uuid primary key default gen_random_uuid(),
  order_no     text not null unique,
  user_id      uuid not null references profiles(id) on delete cascade,
  user_email   text not null,
  project_key  text not null references access_projects(project_key) on delete cascade,
  plan         text not null check (plan in ('monthly', 'quarterly', 'yearly', 'lifetime')),
  amount_cny   numeric(10, 2) not null,
  status       text not null default 'pending' check (status in ('pending', 'fulfilled', 'canceled')),
  fulfilled_by uuid references profiles(id) on delete set null,
  fulfilled_at timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_project_payment_requests_user
  on project_payment_requests(user_id, status, created_at desc);

create index if not exists idx_project_payment_requests_status
  on project_payment_requests(status, created_at desc);

alter table project_payment_requests enable row level security;

drop policy if exists "付款申请本人和管理员可读" on project_payment_requests;
create policy "付款申请本人和管理员可读" on project_payment_requests
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "付款申请本人可创建" on project_payment_requests;
create policy "付款申请本人可创建" on project_payment_requests
  for insert with check (user_id = auth.uid());

drop policy if exists "付款申请管理员可更新" on project_payment_requests;
create policy "付款申请管理员可更新" on project_payment_requests
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function project_access_amount_cny(_plan text)
returns numeric
language sql immutable
as $$
  select case _plan
    when 'monthly' then 9
    when 'quarterly' then 19
    when 'yearly' then 69
    when 'lifetime' then 199
    else null
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

  amount := public.project_access_amount_cny(_plan);

  if amount is null then
    raise exception 'Invalid access plan: %', _plan;
  end if;

  if not exists (select 1 from access_projects where project_key = _project_key and is_enabled) then
    raise exception 'Project is not enabled: %', _project_key;
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

create or replace function fulfill_project_payment_request(_request_id uuid)
returns user_project_entitlements
language plpgsql security definer set search_path = public
as $$
declare
  request project_payment_requests;
  entitlement user_project_entitlements;
begin
  if not public.is_admin() then
    raise exception 'Only admins can fulfill payment requests.';
  end if;

  select *
  into request
  from project_payment_requests
  where id = _request_id
  for update;

  if request.id is null then
    raise exception 'Payment request does not exist: %', _request_id;
  end if;

  if request.status <> 'pending' then
    raise exception 'Payment request is not pending: %', request.order_no;
  end if;

  entitlement := public.grant_project_access(
    request.user_id,
    request.project_key,
    request.plan
  );

  update project_payment_requests
  set
    status = 'fulfilled',
    fulfilled_by = auth.uid(),
    fulfilled_at = now(),
    updated_at = now()
  where id = request.id;

  return entitlement;
end;
$$;
