-- ============================================================
-- Fix payment request UUID generation in restricted search_path functions
-- ============================================================

alter table project_payment_requests
  alter column id set default gen_random_uuid();

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
