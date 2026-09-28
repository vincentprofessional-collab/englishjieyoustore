create table if not exists public.bbc_article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id text not null check (char_length(btrim(article_id)) between 1 and 100),
  author_name text not null check (char_length(btrim(author_name)) between 1 and 40),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.bbc_article_comment_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  comment_count integer not null default 0 check (comment_count >= 0)
);

create index if not exists bbc_article_comments_article_created_idx
  on public.bbc_article_comments (article_id, created_at desc);

alter table public.bbc_article_comments enable row level security;
alter table public.bbc_article_comment_rate_limits enable row level security;

revoke all on public.bbc_article_comments from public, anon, authenticated;
grant select on public.bbc_article_comments to anon, authenticated;
grant all on public.bbc_article_comments to service_role;

drop policy if exists "BBC article comments are public" on public.bbc_article_comments;
create policy "BBC article comments are public"
  on public.bbc_article_comments for select
  to anon, authenticated
  using (true);

revoke all on public.bbc_article_comment_rate_limits from public, anon, authenticated;
grant all on public.bbc_article_comment_rate_limits to service_role;

create or replace function public.post_bbc_article_comment(
  p_article_id text,
  p_author_name text,
  p_body text,
  p_ip_hash text
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
    or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid comment payload' using errcode = '22023';
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
    insert into public.bbc_article_comments (article_id, author_name, body)
    values (btrim(p_article_id), btrim(p_author_name), btrim(p_body))
    returning *;
end;
$$;

revoke all on function public.post_bbc_article_comment(text, text, text, text) from public, anon, authenticated;
grant execute on function public.post_bbc_article_comment(text, text, text, text) to service_role;
