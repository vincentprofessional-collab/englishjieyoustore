import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getAllVocabularyEntries,
} from "@/lib/vocabulary/local-vocabulary";
import {
  getLearningBookEntries,
  LEARNING_BOOKS,
  toLearningWord,
  type LearningBookKey,
  type LearningWord,
} from "@/lib/vocabulary/learning";
import { getSupplementalLearningWords } from "@/lib/vocabulary/supplemental-learning-books";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const BOOK_KEYS = new Set<string>(LEARNING_BOOKS.map(({ key }) => key));
const QUESTION_COUNT = 20;
const QUESTION_TIME_MS = 10_000;

type PkQuestion = { wordId: string; word: string; choices: string[]; correctIndex: number };

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serviceClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function authToken(request: Request) {
  return /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim() ?? "";
}

async function memberFor(request: Request, db: NonNullable<ReturnType<typeof serviceClient>>) {
  const token = authToken(request);
  if (!token || !supabaseUrl || !supabaseAnonKey) return null;
  const { data: { user }, error } = await createClient(supabaseUrl, supabaseAnonKey).auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await db.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    name: String(profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "学习者").slice(0, 40),
    avatar: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
  };
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function bookWords(bookKey: string): LearningWord[] | null {
  if (!BOOK_KEYS.has(bookKey)) return null;
  const supplemental = getSupplementalLearningWords(bookKey as LearningBookKey);
  if (supplemental) return supplemental;
  return getLearningBookEntries(getAllVocabularyEntries(), bookKey as LearningBookKey).map(toLearningWord);
}

function buildQuestions(bookKey: string, requestedIds?: unknown): PkQuestion[] | null {
  const words = bookWords(bookKey);
  if (!words || words.length < QUESTION_COUNT) return null;
  const byId = new Map(words.map((word) => [word.id, word]));
  let targets: LearningWord[];
  if (Array.isArray(requestedIds)) {
    const ids = [...new Set(requestedIds.filter((id): id is string => typeof id === "string"))];
    if (ids.length === 0 || ids.length > QUESTION_COUNT || ids.some((id) => !byId.has(id))) return null;
    targets = ids.map((id) => byId.get(id)!);
  } else {
    const groupCount = Math.ceil(words.length / QUESTION_COUNT);
    const groupNo = Math.floor(Math.random() * groupCount);
    targets = words.slice(groupNo * QUESTION_COUNT, (groupNo + 1) * QUESTION_COUNT);
  }
  if (targets.length < QUESTION_COUNT) {
    const selectedIds = new Set(targets.map((word) => word.id));
    targets = [...targets, ...shuffle(words.filter((word) => !selectedIds.has(word.id))).slice(0, QUESTION_COUNT - targets.length)];
  }

  const definitionPool = [...new Set(words.map((word) => word.definitionCn.trim()).filter(Boolean))];
  if (definitionPool.length < 4) return null;
  return targets.map((word) => {
    const correct = word.definitionCn.trim();
    const distractors = shuffle(definitionPool.filter((definition) => definition !== correct)).slice(0, 3);
    const choices = shuffle([correct, ...distractors]);
    return { wordId: word.id, word: word.word, choices, correctIndex: choices.indexOf(correct) };
  });
}

function rankFor(stats: { points?: number; questions?: number; correct?: number; wins?: number; losses?: number; matches?: number } | null) {
  const questions = Number(stats?.questions ?? 0);
  const correct = Number(stats?.correct ?? 0);
  const wins = Number(stats?.wins ?? 0);
  const matches = Number(stats?.matches ?? 0);
  const points = Number(stats?.points ?? 0);
  const accuracy = questions ? correct / questions * 100 : 0;
  const winRate = matches ? wins / matches * 100 : 0;
  const tiers = [
    { name: "最强王者", questions: 2000, points: 60000, accuracy: 95, wins: 70 },
    { name: "至尊星耀", questions: 1600, points: 40000, accuracy: 80, wins: 60 },
    { name: "钻石", questions: 1200, points: 24000, accuracy: 70, wins: 55 },
    { name: "铂金", questions: 800, points: 13000, accuracy: 65, wins: 50 },
    { name: "黄金", questions: 400, points: 6500, accuracy: 60, wins: 45 },
    { name: "白银", questions: 200, points: 2500, accuracy: 55, wins: 40 },
  ];
  const tier = tiers.find((item) => questions >= item.questions && points >= item.points && accuracy >= item.accuracy && winRate >= item.wins);
  return { name: tier?.name ?? "青铜", accuracy: Math.round(accuracy * 10) / 10, winRate: Math.round(winRate * 10) / 10 };
}

function periodStart(period: string) {
  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [year, month, day] = dateParts.split("-").map(Number);
  if (period === "year") return `${year}-01-01T00:00:00+08:00`;
  if (period === "quarter") return `${year}-${String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, "0")}-01T00:00:00+08:00`;
  if (period === "month") return `${year}-${String(month).padStart(2, "0")}-01T00:00:00+08:00`;
  return null;
}

async function answerTimeout(db: NonNullable<ReturnType<typeof serviceClient>>, player: Record<string, any>, questionNo: number) {
  const { data: existing } = await db.from("vocabulary_pk_answers").select("id").eq("player_id", player.id).eq("question_no", questionNo).maybeSingle();
  if (existing) return;
  const { error } = await db.from("vocabulary_pk_answers").insert({ player_id: player.id, question_no: questionNo, choice_index: null, is_correct: false, response_ms: QUESTION_TIME_MS });
  if (!error) {
    await db.from("vocabulary_pk_players").update({ answered_count: Number(player.answered_count) + 1, total_answer_ms: Number(player.total_answer_ms) + QUESTION_TIME_MS }).eq("id", player.id);
  }
}

async function finishIfReady(db: NonNullable<ReturnType<typeof serviceClient>>, matchId: string) {
  await db.rpc("vocabulary_pk_finish_match", { p_match_id: matchId });
}

export async function GET(request: Request) {
  const db = serviceClient();
  if (!db) return jsonError("PK 服务暂未配置。", 503);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const book = url.searchParams.get("book") ?? "初中";
  const period = url.searchParams.get("period") ?? "month";
  if (!BOOK_KEYS.has(book)) return jsonError("词汇书参数无效。");

  if (action === "profile") {
    const member = await memberFor(request, db);
    if (!member) return NextResponse.json({ loggedIn: false });
    const { data: stats, error } = await db.from("vocabulary_pk_stats").select("points,matches,wins,losses,draws,questions,correct").eq("user_id", member.id).eq("book_key", book).maybeSingle();
    if (error) return jsonError("个人积分读取失败。", 500);
    const rank = rankFor(stats);
    return NextResponse.json({ loggedIn: true, nickname: member.name, avatar: member.avatar, points: Number(stats?.points ?? 0), matches: Number(stats?.matches ?? 0), wins: Number(stats?.wins ?? 0), questions: Number(stats?.questions ?? 0), ...rank });
  }

  if (action !== "leaderboard" || !["month", "quarter", "year", "all"].includes(period)) return jsonError("排行榜参数无效。");

  if (period === "all") {
    const { data: rows, error } = await db.from("vocabulary_pk_stats").select("user_id,points,matches,wins,losses,draws,questions,correct").eq("book_key", book).order("points", { ascending: false }).limit(100);
    if (error) return jsonError("排行榜读取失败。", 500);
    const userIds = (rows ?? []).map((row) => row.user_id);
    if (!userIds.length) return NextResponse.json({ period, book, rows: [] });
    const users = await db.from("profiles").select("id,display_name,avatar_url").in("id", userIds);
    const names = new Map((users.data ?? []).map((user) => [user.id, user]));
    return NextResponse.json({ period, book, rows: (rows ?? []).map((row, index) => ({
      rank: index + 1, nickname: names.get(row.user_id)?.display_name || "学习者", avatar: names.get(row.user_id)?.avatar_url ?? null,
      points: row.points, matches: row.matches, wins: row.wins, accuracy: rankFor(row).accuracy, tier: rankFor(row).name,
    })) });
  }

  const start = periodStart(period);
  const { data: participants, error } = await db.from("vocabulary_pk_players")
    .select("user_id,display_name,avatar_url,match_points,result,answered_count,correct_count,total_answer_ms,match:vocabulary_pk_matches!inner(book_key,completed_at,ranked,status)")
    .eq("match.book_key", book).eq("match.ranked", true).eq("match.status", "completed").gte("match.completed_at", start!);
  if (error) return jsonError("排行榜读取失败。", 500);
  const totals = new Map<string, { nickname: string; avatar: string | null; points: number; matches: number; wins: number; questions: number; correct: number; latest: number }>();
  for (const row of participants ?? []) {
    if (!row.user_id) continue;
    const joinedMatches = Array.isArray(row.match) ? row.match : row.match ? [row.match] : [];
    const completedAt = Date.parse(joinedMatches[0]?.completed_at ?? "");
    const current = totals.get(row.user_id) ?? { nickname: row.display_name, avatar: row.avatar_url, points: 0, matches: 0, wins: 0, questions: 0, correct: 0, latest: 0 };
    current.points += Number(row.match_points ?? 0);
    current.matches += 1;
    current.wins += row.result === "win" ? 1 : 0;
    current.questions += Number(row.answered_count ?? 0);
    current.correct += Number(row.correct_count ?? 0);
    if (completedAt >= current.latest) { current.latest = completedAt; current.nickname = row.display_name; current.avatar = row.avatar_url; }
    totals.set(row.user_id, current);
  }
  const rows = [...totals.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || b.correct / Math.max(1, b.questions) - a.correct / Math.max(1, a.questions)).slice(0, 100);
  return NextResponse.json({ period, book, rows: rows.map((row, index) => ({
    rank: index + 1, nickname: row.nickname, avatar: row.avatar, points: row.points, matches: row.matches, wins: row.wins,
    accuracy: Math.round(row.correct / Math.max(1, row.questions) * 1000) / 10,
  })) });
}

export async function POST(request: Request) {
  const db = serviceClient();
  if (!db) return jsonError("PK 服务暂未配置。", 503);
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : "";
  const now = Date.now();

  if (action === "create-invite" || action === "queue") {
    const member = await memberFor(request, db);
    if (action === "queue" && !member) return jsonError("自动匹配和积分赛需要先登录。", 401);
    const bookKey = typeof payload.bookKey === "string" ? payload.bookKey : "";
    const questions = buildQuestions(bookKey, payload.wordIds);
    if (!questions) return jsonError("该词汇书需要至少 20 个有中文释义的词汇才能开始 PK。");
    if (action === "create-invite") {
      const inviteToken = randomUUID();
      const playerToken = randomUUID();
      const { data: match, error: matchError } = await db.from("vocabulary_pk_matches").insert({
        invite_token: inviteToken, book_key: bookKey, status: "waiting", ranked: Boolean(member && payload.rankedConsent === true),
        created_by: member?.id ?? null, questions,
      }).select("id").single();
      if (matchError || !match) return jsonError("创建挑战失败，请稍后重试。", 500);
      const { error: playerError } = await db.from("vocabulary_pk_players").insert({
        match_id: match.id, user_id: member?.id ?? null, seat_no: 1, player_token: playerToken,
        ranked_consent: Boolean(member && payload.rankedConsent === true),
        is_guest: !member, display_name: member?.name ?? `访客${Math.floor(1000 + Math.random() * 9000)}`, avatar_url: member?.avatar ?? null,
      });
      if (playerError) return jsonError("创建挑战失败，请稍后重试。", 500);
      return NextResponse.json({ status: "waiting", matchId: match.id, inviteToken, playerToken, ranked: Boolean(member && payload.rankedConsent === true) });
    }
    if (!member) return jsonError("自动匹配和积分赛需要先登录。", 401);
    const { data: stats } = await db.from("vocabulary_pk_stats").select("points,matches,wins,losses,questions,correct").eq("user_id", member.id).eq("book_key", bookKey).maybeSingle();
    const tier = rankFor(stats).name;
    const queueToken = randomUUID();
    const { data: queued, error } = await db.rpc("vocabulary_pk_join_queue", {
      p_user_id: member.id, p_book_key: bookKey, p_rank_name: tier, p_display_name: member.name,
      p_avatar_url: member.avatar, p_questions: questions, p_queue_token: queueToken,
    });
    if (error || !queued) return jsonError("匹配服务暂时不可用。", 500);
    return NextResponse.json(queued);
  }

  if (action === "join-invite") {
    const inviteToken = typeof payload.inviteToken === "string" ? payload.inviteToken : "";
    const { data: match } = await db.from("vocabulary_pk_matches").select("id,book_key,status,ranked,created_by,created_at").eq("invite_token", inviteToken).maybeSingle();
    if (!match || match.status === "completed" || match.status === "cancelled") return jsonError("这个挑战链接已失效。", 404);
    if (Date.now() - Date.parse(match.created_at) > 15 * 60 * 1000) return jsonError("挑战链接已超过 15 分钟有效期，请让对方重新创建。", 410);
    const member = await memberFor(request, db);
    if (member && member.id === match.created_by) return jsonError("请把挑战链接发给另一位参赛者。", 400);
    const { data: existing } = await db.from("vocabulary_pk_players").select("player_token").eq("match_id", match.id).eq("user_id", member?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle();
    if (existing?.player_token) return NextResponse.json({ matchId: match.id, playerToken: existing.player_token, ranked: match.ranked });
    const { data: occupied } = await db.from("vocabulary_pk_players").select("id").eq("match_id", match.id).eq("seat_no", 2).maybeSingle();
    if (occupied) return jsonError("对手已经进入这场比赛。", 409);
    const playerToken = randomUUID();
    const name = member?.name ?? `访客${Math.floor(1000 + Math.random() * 9000)}`;
    const rankedConsent = Boolean(member && payload.rankedConsent === true);
    const { data: host } = await db.from("vocabulary_pk_players").select("ranked_consent").eq("match_id", match.id).eq("seat_no", 1).maybeSingle();
    const ranked = Boolean(member && match.created_by && rankedConsent && host?.ranked_consent);
    const { error } = await db.from("vocabulary_pk_players").insert({
      match_id: match.id, user_id: member?.id ?? null, seat_no: 2, player_token: playerToken,
      is_guest: !member, display_name: name, avatar_url: member?.avatar ?? null, ranked_consent: rankedConsent,
    });
    if (error) return jsonError("加入比赛失败，挑战可能刚被其他人加入。", 409);
    const { error: startError } = await db.from("vocabulary_pk_matches").update({ status: "active", ranked, started_at: new Date(now).toISOString() }).eq("id", match.id).eq("status", "waiting");
    if (startError) return jsonError("启动比赛失败。", 500);
    return NextResponse.json({ matchId: match.id, playerToken, ranked });
  }

  if (action === "queue-state" || action === "cancel-queue") {
    const queueToken = typeof payload.queueToken === "string" ? payload.queueToken : "";
    const { data: row } = await db.from("vocabulary_pk_queue").select("status,match_id,queue_token").eq("queue_token", queueToken).maybeSingle();
    if (!row) return jsonError("匹配请求已过期。", 404);
    if (action === "cancel-queue" && row.status === "waiting") {
      await db.from("vocabulary_pk_queue").update({ status: "cancelled" }).eq("queue_token", queueToken);
      return NextResponse.json({ status: "cancelled" });
    }
    if (action === "queue-state" && row.status === "waiting") {
      await db.from("vocabulary_pk_queue").update({ created_at: new Date(now).toISOString() }).eq("queue_token", queueToken).eq("status", "waiting");
    }
    return NextResponse.json({ status: row.status, matchId: row.match_id, playerToken: row.status === "matched" ? row.queue_token : null });
  }

  const playerToken = typeof payload.playerToken === "string" ? payload.playerToken : "";
  const { data: player } = await db.from("vocabulary_pk_players").select("*").eq("player_token", playerToken).maybeSingle();
  if (!player) return jsonError("比赛凭证无效，请重新进入挑战链接。", 401);
  const { data: match } = await db.from("vocabulary_pk_matches").select("*").eq("id", player.match_id).single();
  if (!match) return jsonError("比赛记录不存在。", 404);
  if (action === "cancel-invite") {
    if (player.seat_no !== 1 || match.status !== "waiting") return jsonError("这场比赛已经开始，无法取消。", 409);
    await db.from("vocabulary_pk_matches").update({ status: "cancelled" }).eq("id", match.id).eq("status", "waiting");
    return NextResponse.json({ status: "cancelled" });
  }
  const questions = match.questions as PkQuestion[];

  if (action === "answer") {
    const questionNo = Number(payload.questionNo);
    const choice = payload.choiceIndex === null ? null : Number(payload.choiceIndex);
    if (!Number.isInteger(questionNo) || questionNo !== Number(player.next_question) || questionNo >= QUESTION_COUNT) return jsonError("这道题已结束，请继续下一题。", 409);
    let startedAt = player.question_started_at ? Date.parse(player.question_started_at) : now;
    if (!player.question_started_at) {
      await db.from("vocabulary_pk_players").update({ question_started_at: new Date(startedAt).toISOString() }).eq("id", player.id);
    }
    const responseMs = Math.min(QUESTION_TIME_MS, Math.max(0, now - startedAt));
    if (responseMs >= QUESTION_TIME_MS) return jsonError("本题作答时间已结束。", 409);
    if (choice !== null && (!Number.isInteger(choice) || choice < 0 || choice > 3)) return jsonError("选项无效。");
    const isCorrect = choice !== null && choice === questions[questionNo]?.correctIndex;
    const { error } = await db.from("vocabulary_pk_answers").insert({ player_id: player.id, question_no: questionNo, choice_index: choice, is_correct: isCorrect, response_ms: responseMs });
    if (error) return jsonError("该题已经提交，请等待下一题。", 409);
    await db.from("vocabulary_pk_players").update({
      answered_count: Number(player.answered_count) + 1,
      correct_count: Number(player.correct_count) + (isCorrect ? 1 : 0),
      total_answer_ms: Number(player.total_answer_ms) + responseMs,
    }).eq("id", player.id);
    return NextResponse.json({ accepted: true, correct: isCorrect });
  }

  if (action !== "state") return jsonError("未知请求。", 404);
  if (match.status === "waiting") {
    const { data: waitingOpponent } = await db.from("vocabulary_pk_players").select("id,display_name,avatar_url").eq("match_id", match.id).neq("id", player.id).maybeSingle();
    return NextResponse.json({ matchId: match.id, status: "waiting", ranked: false, questionNo: 0, totalQuestions: QUESTION_COUNT, question: null,
      revealed: false, selectedIndex: null, answered: false, opponent: waitingOpponent ? { name: waitingOpponent.display_name, avatar: waitingOpponent.avatar_url, answered: false, correct: 0, count: 0, finished: false } : null,
      me: { correct: Number(player.correct_count), answered: Number(player.answered_count), points: 0, result: null, finished: false } });
  }
  const { data: refreshed } = await db.from("vocabulary_pk_players").select("*").eq("id", player.id).single();
  let current = refreshed ?? player;
  let questionNo = Number(current.next_question);
  let answer: Record<string, any> | null = null;
  let correctIndex: number | null = null;
  let reveal = false;
  if (questionNo < QUESTION_COUNT && match.status !== "completed") {
    if (!current.question_started_at) {
      const startedAt = new Date(now).toISOString();
      await db.from("vocabulary_pk_players").update({ question_started_at: startedAt }).eq("id", current.id);
      current.question_started_at = startedAt;
    }
    const elapsed = now - Date.parse(current.question_started_at);
    const { data: savedAnswer } = await db.from("vocabulary_pk_answers").select("choice_index,is_correct,response_ms").eq("player_id", current.id).eq("question_no", questionNo).maybeSingle();
    answer = savedAnswer;
    if (elapsed >= QUESTION_TIME_MS && !current.question_revealed_at) {
      if (!savedAnswer) {
        await answerTimeout(db, current, questionNo);
        current.answered_count = Number(current.answered_count) + 1;
        current.total_answer_ms = Number(current.total_answer_ms) + QUESTION_TIME_MS;
      }
      current.question_revealed_at = new Date(now).toISOString();
      await db.from("vocabulary_pk_players").update({ question_revealed_at: current.question_revealed_at }).eq("id", current.id);
      reveal = true;
    } else if (current.question_revealed_at && now - Date.parse(current.question_revealed_at) >= 1500) {
      if (questionNo === QUESTION_COUNT - 1) {
        await db.from("vocabulary_pk_players").update({ next_question: QUESTION_COUNT, finished_at: new Date(now).toISOString(), question_started_at: null, question_revealed_at: null }).eq("id", current.id);
        current.next_question = QUESTION_COUNT;
        current.finished_at = new Date(now).toISOString();
      } else {
        await db.from("vocabulary_pk_players").update({ next_question: questionNo + 1, question_started_at: new Date(now).toISOString(), question_revealed_at: null }).eq("id", current.id);
        current.next_question = questionNo + 1;
        current.question_started_at = new Date(now).toISOString();
        current.question_revealed_at = null;
      }
      questionNo = Number(current.next_question);
      answer = null;
    } else if (current.question_revealed_at) {
      reveal = true;
    }
    if (reveal && questionNo < QUESTION_COUNT) correctIndex = questions[questionNo]?.correctIndex ?? null;
  }
  if (current.finished_at) await finishIfReady(db, match.id);

  const { data: players } = await db.from("vocabulary_pk_players").select("id,seat_no,display_name,avatar_url,correct_count,answered_count,next_question,finished_at").eq("match_id", match.id).order("seat_no");
  const opponent = (players ?? []).find((item) => item.id !== current.id);
  const { data: opponentAnswer } = opponent && questionNo < QUESTION_COUNT
    ? await db.from("vocabulary_pk_answers").select("is_correct").eq("player_id", opponent.id).eq("question_no", questionNo).maybeSingle()
    : { data: null };
  const question = questionNo < QUESTION_COUNT ? questions[questionNo] : null;
  const { data: finalMatch } = await db.from("vocabulary_pk_matches").select("status,ranked,completed_at").eq("id", match.id).single();
  const { data: finalPlayer } = await db.from("vocabulary_pk_players").select("correct_count,answered_count,match_points,result").eq("id", current.id).single();
  return NextResponse.json({
    matchId: match.id, status: finalMatch?.status ?? match.status, ranked: finalMatch?.ranked ?? match.ranked,
    questionNo, totalQuestions: QUESTION_COUNT, remainingMs: question && current.question_started_at ? Math.max(0, QUESTION_TIME_MS - (now - Date.parse(current.question_started_at))) : 0,
    question: question ? { word: question.word, choices: question.choices, correctIndex } : null,
    revealed: reveal, selectedIndex: answer?.choice_index ?? null, answered: Boolean(answer),
    opponent: opponent ? { name: opponent.display_name, avatar: opponent.avatar_url, answered: Number(opponent.next_question) > questionNo || Boolean(opponent.finished_at) || Boolean(opponentAnswer), currentCorrect: opponentAnswer?.is_correct ?? null, correct: Number(opponent.correct_count), count: Number(opponent.answered_count), finished: Boolean(opponent.finished_at) } : null,
    me: { correct: Number(finalPlayer?.correct_count ?? current.correct_count), answered: Number(finalPlayer?.answered_count ?? current.answered_count), points: Number(finalPlayer?.match_points ?? 0), result: finalPlayer?.result ?? null, finished: Boolean(current.finished_at) },
  });
}
