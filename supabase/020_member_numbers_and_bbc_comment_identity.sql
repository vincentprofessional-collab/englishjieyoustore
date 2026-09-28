create sequence if not exists public.member_number_seq start with 1;

alter table public.profiles
  add column if not exists member_number bigint;

create unique index if not exists profiles_member_number_uidx
  on public.profiles (member_number)
  where member_number is not null;

-- Assign one site-wide number per member, based on their earliest paid access.
with eligible_members as (
  select entitlement.user_id, min(entitlement.created_at) as joined_at
  from public.user_project_entitlements entitlement
  where entitlement.status = 'active'
    and entitlement.starts_at <= now()
    and entitlement.expires_at > now()
  group by entitlement.user_id
  union all
  select profile.id, profile.created_at
  from public.profiles profile
  where profile.membership_status = 'lifetime'
    or (
      profile.membership_status = 'paid'
      and profile.membership_expires_at > now()
    )
), first_membership as (
  select user_id, min(joined_at) as joined_at
  from eligible_members
  group by user_id
), numbered_members as (
  select
    user_id,
    row_number() over (order by joined_at nulls last, user_id)::bigint as member_number
  from first_membership
)
update public.profiles profile
set member_number = numbered_members.member_number
from numbered_members
where profile.id = numbered_members.user_id
  and profile.member_number is null;

select setval(
  'public.member_number_seq',
  coalesce((select max(member_number) from public.profiles), 0) + 1,
  false
);

create or replace function public.assign_profile_member_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.member_number is null and (
    new.membership_status = 'lifetime'
    or (new.membership_status = 'paid' and new.membership_expires_at > now())
  ) then
    new.member_number := nextval('public.member_number_seq');
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_assign_member_number on public.profiles;
create trigger profiles_assign_member_number
  before insert or update of membership_status, membership_expires_at
  on public.profiles
  for each row execute function public.assign_profile_member_number();

create or replace function public.assign_entitlement_member_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active'
    and new.starts_at <= now()
    and new.expires_at > now() then
    update public.profiles
    set member_number = nextval('public.member_number_seq')
    where id = new.user_id
      and member_number is null;
  end if;

  return new;
end;
$$;

drop trigger if exists entitlement_assign_member_number on public.user_project_entitlements;
create trigger entitlement_assign_member_number
  after insert or update of status, starts_at, expires_at
  on public.user_project_entitlements
  for each row execute function public.assign_entitlement_member_number();

alter table public.bbc_article_comments
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists avatar_url text,
  add column if not exists member_plan text
    check (member_plan is null or member_plan in ('monthly', 'quarterly', 'yearly', 'lifetime')),
  add column if not exists member_number bigint;

create index if not exists bbc_article_comments_user_created_idx
  on public.bbc_article_comments (user_id, created_at desc);

drop function if exists public.post_bbc_article_comment(text, text, text, text);

create function public.post_bbc_article_comment(
  p_article_id text,
  p_author_name text,
  p_body text,
  p_ip_hash text,
  p_user_id uuid,
  p_avatar_url text,
  p_member_plan text,
  p_member_number bigint
)
returns setof public.bbc_article_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  if char_length(btrim(p_article_id)) not between 1 and 100
    or char_length(btrim(p_author_name)) not between 1 and 40
    or char_length(btrim(p_body)) not between 1 and 1000
    or p_ip_hash !~ '^[0-9a-f]{64}$'
    or (p_member_plan is not null and p_member_plan not in ('monthly', 'quarterly', 'yearly', 'lifetime')) then
    raise exception 'invalid comment payload' using errcode = '22023';
  end if;

  if p_user_id is not null and not exists (
    select 1 from public.profiles where id = p_user_id
  ) then
    raise exception 'comment author does not exist' using errcode = '22023';
  end if;

  delete from public.bbc_article_comment_rate_limits
  where window_started_at < now() - interval '24 hours';

  insert into public.bbc_article_comment_rate_limits (ip_hash, window_started_at, comment_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set window_started_at = case
          when public.bbc_article_comment_rate_limits.window_started_at < now() - interval '1 hour' then now()
          else public.bbc_article_comment_rate_limits.window_started_at
        end,
        comment_count = case
          when public.bbc_article_comment_rate_limits.window_started_at < now() - interval '1 hour' then 1
          else public.bbc_article_comment_rate_limits.comment_count + 1
        end
  returning comment_count into next_count;

  if next_count > 5 then
    raise exception 'comment rate limit exceeded' using errcode = 'P0001';
  end if;

  return query
    insert into public.bbc_article_comments (
      article_id,
      author_name,
      body,
      user_id,
      avatar_url,
      member_plan,
      member_number
    )
    values (
      btrim(p_article_id),
      btrim(p_author_name),
      btrim(p_body),
      p_user_id,
      nullif(btrim(p_avatar_url), ''),
      p_member_plan,
      p_member_number
    )
    returning *;
end;
$$;

revoke all on function public.post_bbc_article_comment(text, text, text, text, uuid, text, text, bigint)
  from public, anon, authenticated;
grant execute on function public.post_bbc_article_comment(text, text, text, text, uuid, text, text, bigint)
  to service_role;
