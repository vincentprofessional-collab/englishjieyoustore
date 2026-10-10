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
  group_key text not null default 'random',
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
  highest_tier_index smallint not null default 0 check (highest_tier_index between 0 and 6),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_key)
);

alter table public.vocabulary_pk_queue add column if not exists group_key text not null default 'random';
alter table public.vocabulary_pk_stats add column if not exists highest_tier_index smallint not null default 0;

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

drop function if exists public.vocabulary_pk_join_queue(uuid, text, text, text, text, jsonb, uuid);
create or replace function public.vocabulary_pk_join_queue(
  p_user_id uuid,
  p_book_key text,
  p_rank_name text,
  p_display_name text,
  p_avatar_url text,
  p_questions jsonb,
  p_queue_token uuid,
  p_group_key text default 'random'
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
  perform pg_advisory_xact_lock(hashtext(p_book_key || ':' || p_rank_name || ':' || p_group_key));
  select * into v_waiting
  from public.vocabulary_pk_queue
  where status = 'waiting'
    and created_at > now() - interval '30 seconds'
    and user_id <> p_user_id
    and book_key = p_book_key
    and rank_name = p_rank_name
    and group_key = p_group_key
  order by created_at
  for update skip locked
  limit 1;

  if found then
    v_match_id := gen_random_uuid();
    v_invite := gen_random_uuid();
    insert into public.vocabulary_pk_matches(id, invite_token, book_key, status, ranked, created_by, questions, started_at)
    values (v_match_id, v_invite, p_book_key, 'active', true, v_waiting.user_id, v_waiting.questions, now() + interval '3 seconds');
    insert into public.vocabulary_pk_players(match_id, user_id, seat_no, player_token, display_name, avatar_url, ranked_consent)
    values
      (v_match_id, v_waiting.user_id, 1, v_waiting.queue_token, v_waiting.display_name, v_waiting.avatar_url, true),
      (v_match_id, p_user_id, 2, p_queue_token, p_display_name, p_avatar_url, true);
    update public.vocabulary_pk_queue set status = 'matched', match_id = v_match_id where user_id = v_waiting.user_id;
    insert into public.vocabulary_pk_queue(user_id, queue_token, book_key, rank_name, group_key, display_name, avatar_url, questions, match_id, status)
    values (p_user_id, p_queue_token, p_book_key, p_rank_name, p_group_key, p_display_name, p_avatar_url, p_questions, v_match_id, 'matched')
    on conflict (user_id) do update set queue_token = excluded.queue_token, book_key = excluded.book_key,
      rank_name = excluded.rank_name, group_key = excluded.group_key, display_name = excluded.display_name, avatar_url = excluded.avatar_url,
      questions = excluded.questions, match_id = excluded.match_id, status = 'matched', created_at = now();
    return jsonb_build_object('status', 'matched', 'matchId', v_match_id, 'playerToken', p_queue_token);
  end if;

  insert into public.vocabulary_pk_queue(user_id, queue_token, book_key, rank_name, group_key, display_name, avatar_url, questions, match_id, status)
  values (p_user_id, p_queue_token, p_book_key, p_rank_name, p_group_key, p_display_name, p_avatar_url, p_questions, null, 'waiting')
  on conflict (user_id) do update set queue_token = excluded.queue_token, book_key = excluded.book_key,
    rank_name = excluded.rank_name, group_key = excluded.group_key, display_name = excluded.display_name, avatar_url = excluded.avatar_url,
    questions = excluded.questions, match_id = null, status = 'waiting', created_at = now();
  return jsonb_build_object('status', 'waiting', 'queueToken', p_queue_token);
end;
$$;

create or replace function public.vocabulary_pk_tier(p_points bigint, p_questions integer, p_correct integer, p_wins integer, p_draws integer, p_matches integer)
returns smallint language sql immutable set search_path = '' as $$
  select (case
    when p_questions >= 2000 and p_points >= 60000 and p_correct::numeric / greatest(p_questions,1) >= .95 and (p_wins + p_draws * .5) / greatest(p_matches,1) >= .70 then 6
    when p_questions >= 1600 and p_points >= 40000 and p_correct::numeric / greatest(p_questions,1) >= .80 and (p_wins + p_draws * .5) / greatest(p_matches,1) >= .60 then 5
    when p_questions >= 1200 and p_points >= 24000 and p_correct::numeric / greatest(p_questions,1) >= .70 and (p_wins + p_draws * .5) / greatest(p_matches,1) >= .55 then 4
    when p_questions >= 800 and p_points >= 13000 and p_correct::numeric / greatest(p_questions,1) >= .65 and (p_wins + p_draws * .5) / greatest(p_matches,1) >= .50 then 3
    when p_questions >= 400 and p_points >= 6500 and p_correct::numeric / greatest(p_questions,1) >= .60 and (p_wins + p_draws * .5) / greatest(p_matches,1) >= .45 then 2
    when p_questions >= 200 and p_points >= 2500 and p_correct::numeric / greatest(p_questions,1) >= .55 and (p_wins + p_draws * .5) / greatest(p_matches,1) >= .40 then 1
    else 0 end)::smallint;
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
    where p.match_id = p_match_id and p.user_id is not null order by p.user_id
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
    update public.vocabulary_pk_stats s set highest_tier_index = greatest(s.highest_tier_index,
      public.vocabulary_pk_tier(s.points, s.questions, s.correct, s.wins, s.draws, s.matches))
    where s.book_key = v_match.book_key and s.user_id in (v_one.user_id, v_two.user_id);
  end if;
  return jsonb_build_object('status', 'completed', 'winnerPlayerId', v_winner);
end;
$$;

revoke all on function public.vocabulary_pk_join_queue(uuid, text, text, text, text, jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.vocabulary_pk_finish_match(uuid) from public, anon, authenticated;
grant execute on function public.vocabulary_pk_join_queue(uuid, text, text, text, text, jsonb, uuid, text) to service_role;
grant execute on function public.vocabulary_pk_finish_match(uuid) to service_role;

-- All progression derives from the shared match start, including disconnected players.
create or replace function public.vocabulary_pk_reconcile_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_match public.vocabulary_pk_matches%rowtype;
  v_elapsed bigint;
  v_closed integer;
begin
  select * into v_match from public.vocabulary_pk_matches where id = p_match_id for update;
  if not found or v_match.status <> 'active' or v_match.started_at is null then return; end if;
  v_elapsed := floor(extract(epoch from (clock_timestamp() - v_match.started_at)) * 1000);
  v_closed := least(20, greatest(0, floor(v_elapsed / 11500.0)::integer + case when v_elapsed >= 0 and v_elapsed % 11500 >= 10000 then 1 else 0 end));
  insert into public.vocabulary_pk_answers(player_id, question_no, choice_index, is_correct, response_ms)
    select p.id, n, null, false, 10000 from public.vocabulary_pk_players p
    cross join generate_series(0, v_closed - 1) n where p.match_id = p_match_id
    on conflict (player_id, question_no) do nothing;
  update public.vocabulary_pk_players p set
    answered_count = a.answered, correct_count = a.correct, total_answer_ms = a.answer_ms,
    next_question = least(20, greatest(0, floor(v_elapsed / 11500.0)::integer)),
    finished_at = case when v_elapsed >= 230000 then coalesce(p.finished_at, clock_timestamp()) else p.finished_at end
  from (select p2.id, count(a2.id)::smallint answered, count(a2.id) filter (where a2.is_correct)::smallint correct,
      coalesce(sum(a2.response_ms),0)::integer answer_ms
    from public.vocabulary_pk_players p2 left join public.vocabulary_pk_answers a2 on a2.player_id = p2.id
    where p2.match_id = p_match_id group by p2.id) a where p.id = a.id;
  if v_elapsed >= 230000 then perform public.vocabulary_pk_finish_match(p_match_id); end if;
end;
$$;

create or replace function public.vocabulary_pk_play(p_player_token uuid, p_submit boolean default false, p_question_no integer default null, p_choice_index integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_player public.vocabulary_pk_players%rowtype;
  v_match public.vocabulary_pk_matches%rowtype;
  v_opponent public.vocabulary_pk_players%rowtype;
  v_answer public.vocabulary_pk_answers%rowtype;
  v_opponent_answer public.vocabulary_pk_answers%rowtype;
  v_elapsed bigint := 0;
  v_question_no integer := 0;
  v_revealed boolean := false;
  v_question jsonb;
  v_me_correct integer := 0;
  v_opponent_correct integer := 0;
begin
  select * into v_player from public.vocabulary_pk_players where player_token = p_player_token;
  if not found then return jsonb_build_object('error','比赛凭证无效。','code',401); end if;
  select * into v_match from public.vocabulary_pk_matches where id = v_player.match_id for update;
  if v_match.status = 'waiting' and v_match.created_at < now() - interval '15 minutes' then
    update public.vocabulary_pk_matches set status = 'cancelled' where id = v_match.id;
    v_match.status := 'cancelled';
  end if;
  if v_match.status = 'active' then
    perform public.vocabulary_pk_reconcile_match(v_match.id);
    select * into v_match from public.vocabulary_pk_matches where id = v_match.id;
    v_elapsed := floor(extract(epoch from (clock_timestamp() - v_match.started_at)) * 1000);
    v_question_no := least(20, greatest(0, floor(v_elapsed / 11500.0)::integer));
    v_revealed := v_elapsed >= 0 and v_elapsed % 11500 >= 10000;
  elsif v_match.status = 'completed' then v_question_no := 20;
  end if;
  if p_submit then
    if v_match.status <> 'active' or v_elapsed < 0 or v_question_no >= 20 or v_revealed or p_question_no is distinct from v_question_no then
      return jsonb_build_object('error','本题作答时间已结束，请等待下一题。','code',409);
    end if;
    if p_choice_index is null or p_choice_index < 0 or p_choice_index > 3 then
      return jsonb_build_object('error','选项无效。','code',400);
    end if;
    insert into public.vocabulary_pk_answers(player_id, question_no, choice_index, is_correct, response_ms)
      values (v_player.id, v_question_no, p_choice_index, p_choice_index = (v_match.questions -> v_question_no ->> 'correctIndex')::integer, (v_elapsed % 11500)::integer)
      on conflict (player_id, question_no) do nothing;
    return jsonb_build_object('accepted',true);
  end if;
  select * into v_player from public.vocabulary_pk_players where id = v_player.id;
  select * into v_opponent from public.vocabulary_pk_players where match_id = v_match.id and id <> v_player.id;
  select * into v_answer from public.vocabulary_pk_answers where player_id = v_player.id and question_no = v_question_no;
  select * into v_opponent_answer from public.vocabulary_pk_answers where player_id = v_opponent.id and question_no = v_question_no;
  select count(*) filter (where is_correct and (question_no < v_question_no or v_revealed)) into v_me_correct
    from public.vocabulary_pk_answers where player_id = v_player.id;
  select count(*) filter (where is_correct and (question_no < v_question_no or v_revealed)) into v_opponent_correct
    from public.vocabulary_pk_answers where player_id = v_opponent.id;
  if v_match.status = 'active' and v_elapsed >= 0 and v_question_no < 20 then
    v_question := v_match.questions -> v_question_no;
    v_question := jsonb_build_object('word', v_question -> 'word', 'choices', v_question -> 'choices',
      'correctIndex', case when v_revealed then v_question -> 'correctIndex' else 'null'::jsonb end);
  end if;
  return jsonb_build_object(
    'matchId',v_match.id, 'status',v_match.status, 'ranked',v_match.ranked, 'questionNo',v_question_no,'totalQuestions',20,
    'startsInMs',case when v_match.status = 'active' then greatest(0,-v_elapsed) else 0 end,
    'nextUpdateMs',case when v_elapsed < 0 then -v_elapsed when v_revealed then 11500 - (v_elapsed % 11500) else 10000 - (v_elapsed % 11500) end,
    'remainingMs',case when v_question is not null then greatest(0,10000 - (v_elapsed % 11500)) else 0 end,
    'question',v_question,'revealed',v_revealed,'selectedIndex',v_answer.choice_index,'answered',v_answer.id is not null,
    'opponent',case when v_opponent.id is null then null else jsonb_build_object('name',v_opponent.display_name,'avatar',v_opponent.avatar_url,
      'answered',v_opponent_answer.id is not null,'currentCorrect',case when v_revealed then v_opponent_answer.is_correct else null end,
      'correct',v_opponent_correct,'count',v_opponent.answered_count,'finished',v_opponent.finished_at is not null) end,
    'me',jsonb_build_object('correct',v_me_correct,'answered',v_player.answered_count,'points',v_player.match_points,'result',v_player.result,'finished',v_player.finished_at is not null));
end;
$$;

create or replace function public.vocabulary_pk_join_invite(p_invite_token uuid, p_user_id uuid, p_display_name text, p_avatar_url text, p_ranked_consent boolean, p_player_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_match public.vocabulary_pk_matches%rowtype;
  v_host public.vocabulary_pk_players%rowtype;
  v_existing public.vocabulary_pk_players%rowtype;
  v_ranked boolean;
begin
  select * into v_match from public.vocabulary_pk_matches where invite_token = p_invite_token for update;
  if not found or v_match.status in ('completed','cancelled') then return jsonb_build_object('error','这个挑战链接已失效。','code',404); end if;
  if v_match.created_at < now() - interval '15 minutes' then return jsonb_build_object('error','挑战链接已超过 15 分钟有效期。','code',410); end if;
  if p_user_id = v_match.created_by then return jsonb_build_object('error','请把挑战链接发给另一位参赛者。','code',400); end if;
  select * into v_existing from public.vocabulary_pk_players where match_id = v_match.id and user_id = p_user_id;
  if found then return jsonb_build_object('matchId',v_match.id,'playerToken',v_existing.player_token,'ranked',v_match.ranked); end if;
  if v_match.status <> 'waiting' or exists(select 1 from public.vocabulary_pk_players where match_id = v_match.id and seat_no = 2) then
    return jsonb_build_object('error','对手已经进入这场比赛。','code',409);
  end if;
  select * into v_host from public.vocabulary_pk_players where match_id = v_match.id and seat_no = 1;
  if not found then return jsonb_build_object('error','挑战尚未准备完成，请稍后重试。','code',409); end if;
  v_ranked := p_user_id is not null and v_host.user_id is not null and p_ranked_consent and v_host.ranked_consent;
  insert into public.vocabulary_pk_players(match_id,user_id,seat_no,player_token,is_guest,ranked_consent,display_name,avatar_url)
    values (v_match.id,p_user_id,2,p_player_token,p_user_id is null,p_ranked_consent,p_display_name,p_avatar_url);
  update public.vocabulary_pk_matches set status = 'active',ranked = v_ranked,started_at = now() + interval '3 seconds' where id = v_match.id;
  return jsonb_build_object('matchId',v_match.id,'playerToken',p_player_token,'ranked',v_ranked);
end;
$$;

create or replace function public.vocabulary_pk_expire_matches()
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  for v_id in select id from public.vocabulary_pk_matches where status = 'active' and started_at <= now() - interval '230 seconds' loop
    perform public.vocabulary_pk_reconcile_match(v_id);
  end loop;
  update public.vocabulary_pk_matches set status = 'cancelled' where status = 'waiting' and created_at < now() - interval '15 minutes';
end;
$$;

create or replace function public.vocabulary_pk_leaderboard(p_book text, p_start timestamptz)
returns table(user_id uuid, nickname text, avatar text, points bigint, matches bigint, wins bigint, accuracy numeric, tier_index smallint)
language sql stable security definer set search_path = '' as $$
  select p.user_id, coalesce(pr.display_name, max(p.display_name), '学习者'), coalesce(pr.avatar_url, max(p.avatar_url)),
    sum(p.match_points)::bigint, count(*), count(*) filter (where p.result = 'win'),
    round(100.0 * sum(p.correct_count) / greatest(sum(p.answered_count),1),1),
    public.vocabulary_pk_tier(coalesce(s.points,0),coalesce(s.questions,0),coalesce(s.correct,0),coalesce(s.wins,0),coalesce(s.draws,0),coalesce(s.matches,0))
  from public.vocabulary_pk_players p join public.vocabulary_pk_matches m on m.id = p.match_id
    left join public.profiles pr on pr.id = p.user_id
    left join public.vocabulary_pk_stats s on s.user_id = p.user_id and s.book_key = p_book
  where m.book_key = p_book and m.status = 'completed' and m.ranked and m.completed_at >= p_start and p.user_id is not null
  group by p.user_id,pr.display_name,pr.avatar_url,s.points,s.questions,s.correct,s.wins,s.draws,s.matches
  order by sum(p.match_points) desc, count(*) filter (where p.result = 'win') desc,
    sum(p.correct_count)::numeric / greatest(sum(p.answered_count),1) desc, p.user_id limit 100;
$$;

revoke all on function public.vocabulary_pk_tier(bigint, integer, integer, integer, integer, integer),
  public.vocabulary_pk_reconcile_match(uuid), public.vocabulary_pk_play(uuid, boolean, integer, integer),
  public.vocabulary_pk_join_invite(uuid, uuid, text, text, boolean, uuid), public.vocabulary_pk_expire_matches(), public.vocabulary_pk_leaderboard(text, timestamptz) from public, anon, authenticated;
grant execute on function public.vocabulary_pk_tier(bigint, integer, integer, integer, integer, integer),
  public.vocabulary_pk_reconcile_match(uuid), public.vocabulary_pk_play(uuid, boolean, integer, integer),
  public.vocabulary_pk_join_invite(uuid, uuid, text, text, boolean, uuid), public.vocabulary_pk_expire_matches(), public.vocabulary_pk_leaderboard(text, timestamptz) to service_role;

create index if not exists vocabulary_pk_active_deadline_idx on public.vocabulary_pk_matches(started_at) where status = 'active';
create index if not exists vocabulary_pk_completed_book_idx on public.vocabulary_pk_matches(book_key, completed_at) where status = 'completed' and ranked;
create extension if not exists pg_cron;
select cron.schedule('vocabulary-pk-settle-expired', '* * * * *', 'select public.vocabulary_pk_expire_matches()');
notify pgrst, 'reload schema';
