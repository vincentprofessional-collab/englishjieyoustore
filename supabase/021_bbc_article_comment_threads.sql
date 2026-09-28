alter table public.bbc_article_comments
  add column if not exists parent_comment_id uuid
    references public.bbc_article_comments(id) on delete cascade,
  add column if not exists reply_to_comment_id uuid
    references public.bbc_article_comments(id) on delete set null;

create index if not exists bbc_article_comments_thread_created_idx
  on public.bbc_article_comments (article_id, parent_comment_id, created_at asc);

grant delete on public.bbc_article_comments to authenticated;
drop policy if exists "BBC article comments delete by admins" on public.bbc_article_comments;
create policy "BBC article comments delete by admins"
  on public.bbc_article_comments for delete
  to authenticated
  using (public.is_admin());

drop function if exists public.post_bbc_article_comment(text, text, text, text, uuid, text, text, bigint);

create function public.post_bbc_article_comment(
  p_article_id text,
  p_author_name text,
  p_body text,
  p_ip_hash text,
  p_user_id uuid,
  p_avatar_url text,
  p_member_plan text,
  p_member_number bigint,
  p_parent_comment_id uuid,
  p_reply_to_comment_id uuid
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

  if p_parent_comment_id is null then
    if p_reply_to_comment_id is not null then
      raise exception 'reply target requires a thread parent' using errcode = '22023';
    end if;
  else
    if not exists (
      select 1
      from public.bbc_article_comments
      where id = p_parent_comment_id
        and article_id = btrim(p_article_id)
        and parent_comment_id is null
    ) then
      raise exception 'comment thread does not exist' using errcode = '22023';
    end if;

    if p_reply_to_comment_id is null then
      p_reply_to_comment_id := p_parent_comment_id;
    end if;

    if not exists (
      select 1
      from public.bbc_article_comments
      where id = p_reply_to_comment_id
        and article_id = btrim(p_article_id)
        and (id = p_parent_comment_id or parent_comment_id = p_parent_comment_id)
    ) then
      raise exception 'reply target is outside this thread' using errcode = '22023';
    end if;
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
      member_number,
      parent_comment_id,
      reply_to_comment_id
    )
    values (
      btrim(p_article_id),
      btrim(p_author_name),
      btrim(p_body),
      p_user_id,
      nullif(btrim(p_avatar_url), ''),
      p_member_plan,
      p_member_number,
      p_parent_comment_id,
      p_reply_to_comment_id
    )
    returning *;
end;
$$;

revoke all on function public.post_bbc_article_comment(text, text, text, text, uuid, text, text, bigint, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.post_bbc_article_comment(text, text, text, text, uuid, text, text, bigint, uuid, uuid)
  to service_role;
