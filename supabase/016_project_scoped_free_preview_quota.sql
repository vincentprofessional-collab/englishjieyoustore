-- Give every paid project its own persistent three-item preview quota.
-- Existing preview rows are retained and become scoped by project_key.

drop index if exists paid_content_preview_accesses_user_content;
drop index if exists paid_content_preview_accesses_visitor_content;
drop index if exists paid_content_preview_accesses_user_count;
drop index if exists paid_content_preview_accesses_visitor_count;

create unique index paid_content_preview_accesses_user_content
  on paid_content_preview_accesses(user_id, project_key, content_key)
  where user_id is not null;

create unique index paid_content_preview_accesses_visitor_content
  on paid_content_preview_accesses(visitor_id, project_key, content_key)
  where visitor_id is not null;

create index paid_content_preview_accesses_user_count
  on paid_content_preview_accesses(user_id, project_key)
  where user_id is not null;

create index paid_content_preview_accesses_visitor_count
  on paid_content_preview_accesses(visitor_id, project_key)
  where visitor_id is not null;

create or replace function claim_paid_content_access(
  _project_key text,
  _content_key text,
  _visitor_id uuid,
  _free_limit int default 3
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  actor_count int;
  user_lock_key bigint;
  visitor_lock_key bigint;
begin
  if _project_key is null or not exists (
    select 1
    from access_projects
    where project_key = _project_key
      and is_enabled
  ) then
    return false;
  end if;

  if _content_key is null or char_length(btrim(_content_key)) not between 3 and 250 then
    return false;
  end if;

  if actor_user_id is null and _visitor_id is null then
    return false;
  end if;

  if actor_user_id is not null then
    user_lock_key := hashtextextended('paid-preview:user:' || actor_user_id::text, 0);
    perform pg_advisory_xact_lock(user_lock_key);

    if _visitor_id is not null then
      visitor_lock_key := hashtextextended('paid-preview:visitor:' || _visitor_id::text, 0);
      perform pg_advisory_xact_lock(visitor_lock_key);

      insert into paid_content_preview_accesses (user_id, project_key, content_key, first_accessed_at)
      select actor_user_id, project_key, content_key, first_accessed_at
      from paid_content_preview_accesses
      where visitor_id = _visitor_id
      on conflict (user_id, project_key, content_key) where user_id is not null do nothing;

      delete from paid_content_preview_accesses
      where visitor_id = _visitor_id;
    end if;

    if public.has_active_project_access(_project_key) then
      return true;
    end if;

    if exists (
      select 1
      from paid_content_preview_accesses
      where user_id = actor_user_id
        and project_key = _project_key
        and content_key = btrim(_content_key)
    ) then
      return true;
    end if;

    select count(*)::int
    into actor_count
    from paid_content_preview_accesses
    where user_id = actor_user_id
      and project_key = _project_key;

    if actor_count >= greatest(coalesce(_free_limit, 0), 0) then
      return false;
    end if;

    insert into paid_content_preview_accesses (user_id, project_key, content_key)
    values (actor_user_id, _project_key, btrim(_content_key));

    return true;
  end if;

  visitor_lock_key := hashtextextended('paid-preview:visitor:' || _visitor_id::text, 0);
  perform pg_advisory_xact_lock(visitor_lock_key);

  if exists (
    select 1
    from paid_content_preview_accesses
    where visitor_id = _visitor_id
      and project_key = _project_key
      and content_key = btrim(_content_key)
  ) then
    return true;
  end if;

  select count(*)::int
  into actor_count
  from paid_content_preview_accesses
  where visitor_id = _visitor_id
    and project_key = _project_key;

  if actor_count >= greatest(coalesce(_free_limit, 0), 0) then
    return false;
  end if;

  insert into paid_content_preview_accesses (visitor_id, project_key, content_key)
  values (_visitor_id, _project_key, btrim(_content_key));

  return true;
end;
$$;

revoke all on function claim_paid_content_access(text, text, uuid, int) from public;
grant execute on function claim_paid_content_access(text, text, uuid, int) to anon, authenticated;
