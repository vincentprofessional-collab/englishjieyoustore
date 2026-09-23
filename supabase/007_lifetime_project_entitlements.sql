-- ============================================================
-- Add lifetime project access plan
-- Run after supabase/006_project_entitlements.sql if 006 was already applied.
-- ============================================================

alter table user_project_entitlements
  drop constraint if exists user_project_entitlements_plan_check;

alter table user_project_entitlements
  add constraint user_project_entitlements_plan_check
  check (plan in ('monthly', 'quarterly', 'yearly', 'lifetime'));

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
