create table if not exists public.vocabulary_video_cycles (
  word text primary key check (length(word) between 1 and 100),
  started_at timestamptz not null default now()
);

create table if not exists public.vocabulary_video_votes (
  word text not null check (length(word) between 1 and 100),
  video_path text not null check (length(video_path) between 1 and 1024),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (word, video_path, user_id)
);

create index if not exists idx_vocabulary_video_votes_word_path
  on public.vocabulary_video_votes (word, video_path);

alter table public.vocabulary_video_votes enable row level security;
alter table public.vocabulary_video_cycles enable row level security;

drop policy if exists "用户查看自己的词汇视频点赞" on public.vocabulary_video_votes;
create policy "用户查看自己的词汇视频点赞"
  on public.vocabulary_video_votes for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "用户给词汇视频点赞" on public.vocabulary_video_votes;
create policy "用户给词汇视频点赞"
  on public.vocabulary_video_votes for insert to authenticated
  with check (user_id = auth.uid());

revoke all on public.vocabulary_video_votes from anon, authenticated;
grant select, insert on public.vocabulary_video_votes to authenticated;
revoke all on public.vocabulary_video_cycles from anon, authenticated;

create or replace function public.get_or_start_vocabulary_video_cycle(target_word text)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_word text := lower(btrim(target_word));
  cycle_started_at timestamptz;
begin
  if normalized_word is null or length(normalized_word) not between 1 and 100 then
    raise exception 'Invalid vocabulary word';
  end if;

  insert into public.vocabulary_video_cycles (word)
  values (normalized_word)
  on conflict (word) do nothing;

  select started_at into cycle_started_at
  from public.vocabulary_video_cycles
  where word = normalized_word;

  return cycle_started_at;
end;
$$;

create or replace function public.get_vocabulary_video_ranking_counts(
  target_word text,
  target_paths text[]
)
returns table (video_path text, likes bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select requested.video_path, count(votes.user_id)::bigint as likes
  from unnest(coalesce(target_paths, array[]::text[])) as requested(video_path)
  left join public.vocabulary_video_votes as votes
    on votes.word = lower(btrim(target_word))
    and votes.video_path = requested.video_path
  where cardinality(coalesce(target_paths, array[]::text[])) <= 300
    and length(requested.video_path) between 1 and 1024
  group by requested.video_path;
$$;

revoke all on function public.get_or_start_vocabulary_video_cycle(text) from public;
revoke all on function public.get_vocabulary_video_ranking_counts(text, text[]) from public;
grant execute on function public.get_or_start_vocabulary_video_cycle(text) to anon, authenticated;
grant execute on function public.get_vocabulary_video_ranking_counts(text, text[]) to anon, authenticated;

create or replace function public.get_vocabulary_video_vote_counts(target_word text)
returns table (video_path text, likes bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select votes.video_path, count(votes.user_id)::bigint as likes
  from public.vocabulary_video_votes as votes
  where votes.word = lower(btrim(target_word))
  group by votes.video_path;
$$;

revoke all on function public.get_vocabulary_video_vote_counts(text) from public;
grant execute on function public.get_vocabulary_video_vote_counts(text) to anon, authenticated;
