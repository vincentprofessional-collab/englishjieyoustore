create table if not exists public.vocabulary_pk_matches (
  id uuid primary key default gen_random_uuid(),
  invite_token uuid not null unique default gen_random_uuid(),
  book_key text not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed', 'cancelled')),
  ranked boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  questions jsonb not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.vocabulary_pk_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.vocabulary_pk_matches(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  seat_no smallint not null check (seat_no in (1, 2)),
  player_token uuid not null unique,
  is_guest boolean not null default false,
  ranked_consent boolean not null default false,
  display_name text not null,
  avatar_url text,
  next_question smallint not null default 0 check (next_question between 0 and 20),
  question_started_at timestamptz,
  question_revealed_at timestamptz,
  correct_count smallint not null default 0,
  answered_count smallint not null default 0,
  total_answer_ms integer not null default 0,
  finished_at timestamptz,
  result text check (result in ('win', 'loss', 'draw')),
  match_points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, seat_no)
);

create unique index if not exists vocabulary_pk_players_match_user_uidx
  on public.vocabulary_pk_players(match_id, user_id) where user_id is not null;

create table if not exists public.vocabulary_pk_answers (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.vocabulary_pk_players(id) on delete cascade,
  question_no smallint not null check (question_no between 0 and 19),
  choice_index smallint check (choice_index between 0 and 3),
  is_correct boolean not null default false,
  response_ms integer not null default 10000 check (response_ms between 0 and 10000),
  created_at timestamptz not null default now(),
  unique (player_id, question_no)
);

create table if not exists public.vocabulary_pk_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  queue_token uuid not null unique,
  book_key text not null,
  rank_name text not null,
  display_name text not null,
  avatar_url text,
  questions jsonb not null,
  match_id uuid references public.vocabulary_pk_matches(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists vocabulary_pk_queue_match_idx
  on public.vocabulary_pk_queue(book_key, rank_name, created_at)
  where status = 'waiting';

create table if not exists public.vocabulary_pk_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_key text not null,
  points bigint not null default 0,
  matches integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  questions integer not null default 0,
  correct integer not null default 0,
  total_answer_ms bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_key)
);

alter table public.vocabulary_pk_matches enable row level security;
alter table public.vocabulary_pk_players enable row level security;
alter table public.vocabulary_pk_answers enable row level security;
alter table public.vocabulary_pk_queue enable row level security;
alter table public.vocabulary_pk_stats enable row level security;

revoke all on public.vocabulary_pk_matches, public.vocabulary_pk_players,
  public.vocabulary_pk_answers, public.vocabulary_pk_queue, public.vocabulary_pk_stats
  from anon, authenticated;
grant all on public.vocabulary_pk_matches, public.vocabulary_pk_players,
  public.vocabulary_pk_answers, public.vocabulary_pk_queue, public.vocabulary_pk_stats
  to service_role;
grant usage, select on sequence public.vocabulary_pk_answers_id_seq to service_role;

create or replace function public.vocabulary_pk_join_queue(
  p_user_id uuid,
  p_book_key text,
  p_rank_name text,
  p_display_name text,
  p_avatar_url text,
  p_questions jsonb,
  p_queue_token uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_waiting public.vocabulary_pk_queue%rowtype;
  v_match_id uuid;
  v_invite uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_book_key || ':' || p_rank_name));
  select * into v_waiting
  from public.vocabulary_pk_queue
  where status = 'waiting'
    and created_at > now() - interval '30 seconds'
    and user_id <> p_user_id
    and book_key = p_book_key
    and rank_name = p_rank_name
  order by created_at
  for update skip locked
  limit 1;

  if found then
    v_match_id := gen_random_uuid();
    v_invite := gen_random_uuid();
    insert into public.vocabulary_pk_matches(id, invite_token, book_key, status, ranked, created_by, questions, started_at)
    values (v_match_id, v_invite, p_book_key, 'active', true, v_waiting.user_id, v_waiting.questions, now());
    insert into public.vocabulary_pk_players(match_id, user_id, seat_no, player_token, display_name, avatar_url, ranked_consent)
    values
      (v_match_id, v_waiting.user_id, 1, v_waiting.queue_token, v_waiting.display_name, v_waiting.avatar_url, true),
      (v_match_id, p_user_id, 2, p_queue_token, p_display_name, p_avatar_url, true);
    update public.vocabulary_pk_queue set status = 'matched', match_id = v_match_id where user_id = v_waiting.user_id;
    insert into public.vocabulary_pk_queue(user_id, queue_token, book_key, rank_name, display_name, avatar_url, questions, match_id, status)
    values (p_user_id, p_queue_token, p_book_key, p_rank_name, p_display_name, p_avatar_url, p_questions, v_match_id, 'matched')
    on conflict (user_id) do update set queue_token = excluded.queue_token, book_key = excluded.book_key,
      rank_name = excluded.rank_name, display_name = excluded.display_name, avatar_url = excluded.avatar_url,
      questions = excluded.questions, match_id = excluded.match_id, status = 'matched', created_at = now();
    return jsonb_build_object('status', 'matched', 'matchId', v_match_id, 'playerToken', p_queue_token);
  end if;

  insert into public.vocabulary_pk_queue(user_id, queue_token, book_key, rank_name, display_name, avatar_url, questions, match_id, status)
  values (p_user_id, p_queue_token, p_book_key, p_rank_name, p_display_name, p_avatar_url, p_questions, null, 'waiting')
  on conflict (user_id) do update set queue_token = excluded.queue_token, book_key = excluded.book_key,
    rank_name = excluded.rank_name, display_name = excluded.display_name, avatar_url = excluded.avatar_url,
    questions = excluded.questions, match_id = null, status = 'waiting', created_at = now();
  return jsonb_build_object('status', 'waiting', 'queueToken', p_queue_token);
end;
$$;

create or replace function public.vocabulary_pk_finish_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.vocabulary_pk_matches%rowtype;
  v_one public.vocabulary_pk_players%rowtype;
  v_two public.vocabulary_pk_players%rowtype;
  v_winner uuid;
begin
  select * into v_match from public.vocabulary_pk_matches where id = p_match_id for update;
  if not found then return jsonb_build_object('status', 'missing'); end if;
  if v_match.status = 'completed' then return jsonb_build_object('status', 'completed'); end if;
  select * into v_one from public.vocabulary_pk_players where match_id = p_match_id and seat_no = 1 for update;
  select * into v_two from public.vocabulary_pk_players where match_id = p_match_id and seat_no = 2 for update;
  if v_one.finished_at is null or v_two.finished_at is null then return jsonb_build_object('status', 'active'); end if;

  if v_one.correct_count > v_two.correct_count then v_winner := v_one.id;
  elsif v_two.correct_count > v_one.correct_count then v_winner := v_two.id;
  elsif v_one.total_answer_ms < v_two.total_answer_ms then v_winner := v_one.id;
  elsif v_two.total_answer_ms < v_one.total_answer_ms then v_winner := v_two.id;
  end if;

  update public.vocabulary_pk_players p set
    result = case when v_winner is null then 'draw' when p.id = v_winner then 'win' else 'loss' end,
    match_points = (p.correct_count * 20) + case when p.id = v_winner then (case when p.id = v_one.id then v_two.correct_count else v_one.correct_count end) * 20 else 0 end
  where p.match_id = p_match_id;

  update public.vocabulary_pk_matches set status = 'completed', completed_at = now(),
    ranked = ranked and v_one.user_id is not null and v_two.user_id is not null
  where id = p_match_id;

  if v_match.ranked and v_one.user_id is not null and v_two.user_id is not null then
    insert into public.vocabulary_pk_stats(user_id, book_key, points, matches, wins, losses, draws, questions, correct, total_answer_ms)
    select p.user_id, v_match.book_key, p.match_points, 1,
      (p.result = 'win')::integer, (p.result = 'loss')::integer, (p.result = 'draw')::integer,
      p.answered_count, p.correct_count, p.total_answer_ms
    from public.vocabulary_pk_players p
    where p.match_id = p_match_id and p.user_id is not null
    on conflict (user_id, book_key) do update set
      points = public.vocabulary_pk_stats.points + excluded.points,
      matches = public.vocabulary_pk_stats.matches + 1,
      wins = public.vocabulary_pk_stats.wins + excluded.wins,
      losses = public.vocabulary_pk_stats.losses + excluded.losses,
      draws = public.vocabulary_pk_stats.draws + excluded.draws,
      questions = public.vocabulary_pk_stats.questions + excluded.questions,
      correct = public.vocabulary_pk_stats.correct + excluded.correct,
      total_answer_ms = public.vocabulary_pk_stats.total_answer_ms + excluded.total_answer_ms,
      updated_at = now();
  end if;
  return jsonb_build_object('status', 'completed', 'winnerPlayerId', v_winner);
end;
$$;

revoke all on function public.vocabulary_pk_join_queue(uuid, text, text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.vocabulary_pk_finish_match(uuid) from public, anon, authenticated;
grant execute on function public.vocabulary_pk_join_queue(uuid, text, text, text, text, jsonb, uuid) to service_role;
grant execute on function public.vocabulary_pk_finish_match(uuid) to service_role;
