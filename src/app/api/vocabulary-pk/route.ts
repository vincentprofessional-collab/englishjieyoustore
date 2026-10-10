import { createHash, randomUUID } from "node:crypto";
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
  const words = bookWords(bookKey)?.filter((word) => word.definitionCn.trim());
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
    const group = [...targets];
    while (targets.length < QUESTION_COUNT) targets.push(group[targets.length % group.length]);
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

const TIER_NAMES = ["青铜", "白银", "黄金", "铂金", "钻石", "至尊星耀", "最强王者"];

function rankFor(stats: { points?: number; questions?: number; correct?: number; wins?: number; draws?: number; losses?: number; matches?: number } | null) {
  const questions = Number(stats?.questions ?? 0);
  const correct = Number(stats?.correct ?? 0);
  const wins = Number(stats?.wins ?? 0);
  const matches = Number(stats?.matches ?? 0);
  const points = Number(stats?.points ?? 0);
  const accuracy = questions ? correct / questions * 100 : 0;
  const winRate = matches ? (wins + Number(stats?.draws ?? 0) / 2) / matches * 100 : 0;
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
    const { data: stats, error } = await db.from("vocabulary_pk_stats").select("points,matches,wins,losses,draws,questions,correct,highest_tier_index").eq("user_id", member.id).eq("book_key", book).maybeSingle();
    if (error) return jsonError("个人积分读取失败。", 500);
    const rank = rankFor(stats);
    return NextResponse.json({ loggedIn: true, nickname: member.name, avatar: member.avatar, points: Number(stats?.points ?? 0), matches: Number(stats?.matches ?? 0), wins: Number(stats?.wins ?? 0), questions: Number(stats?.questions ?? 0), highestName: TIER_NAMES[Number(stats?.highest_tier_index ?? 0)] ?? "青铜", ...rank });
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

  const { data: rows, error } = await db.rpc("vocabulary_pk_leaderboard", { p_book: book, p_start: periodStart(period) });
  if (error) return jsonError("排行榜读取失败。", 500);
  return NextResponse.json({ period, book, rows: (rows ?? []).map((row: { nickname: string; avatar: string | null; points: number; matches: number; wins: number; accuracy: number; tier_index: number }, index: number) => ({
    rank: index + 1, nickname: row.nickname, avatar: row.avatar, points: Number(row.points), matches: Number(row.matches),
    wins: Number(row.wins), accuracy: Number(row.accuracy), tier: TIER_NAMES[row.tier_index] ?? "青铜",
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
    const { data: stats } = await db.from("vocabulary_pk_stats").select("points,matches,wins,losses,draws,questions,correct").eq("user_id", member.id).eq("book_key", bookKey).maybeSingle();
    const tier = rankFor(stats).name;
    const queueToken = randomUUID();
    const { data: queued, error } = await db.rpc("vocabulary_pk_join_queue", {
      p_user_id: member.id, p_book_key: bookKey, p_rank_name: tier, p_display_name: member.name,
      p_avatar_url: member.avatar, p_questions: questions, p_queue_token: queueToken,
      p_group_key: Array.isArray(payload.wordIds) ? createHash("sha256").update([...new Set(payload.wordIds as string[])].sort().join("\n")).digest("hex") : "random",
    });
    if (error || !queued) return jsonError("匹配服务暂时不可用。", 500);
    return NextResponse.json(queued);
  }

  if (action === "join-invite") {
    const inviteToken = typeof payload.inviteToken === "string" ? payload.inviteToken : "";
    if (!/^[0-9a-f-]{36}$/i.test(inviteToken)) return jsonError("挑战链接无效。");
    const member = await memberFor(request, db);
    const { data, error } = await db.rpc("vocabulary_pk_join_invite", {
      p_invite_token: inviteToken, p_user_id: member?.id ?? null,
      p_display_name: member?.name ?? `访客${Math.floor(1000 + Math.random() * 9000)}`,
      p_avatar_url: member?.avatar ?? null, p_ranked_consent: Boolean(member && payload.rankedConsent === true),
      p_player_token: randomUUID(),
    });
    if (error || !data) return jsonError("加入挑战失败，请稍后重试。", 500);
    return data.error ? jsonError(data.error, data.code ?? 400) : NextResponse.json(data);
  }

  if (action === "queue-state" || action === "cancel-queue") {
    const queueToken = typeof payload.queueToken === "string" ? payload.queueToken : "";
    let { data: row } = await db.from("vocabulary_pk_queue").select("status,match_id,queue_token,user_id").eq("queue_token", queueToken).maybeSingle();
    if (!row) return jsonError("匹配请求已过期。", 404);
    if ((await memberFor(request, db))?.id !== row.user_id) return jsonError("请使用参加匹配的账号继续。", 401);
    if (action === "cancel-queue" && row.status === "waiting") {
      const { data: cancelled } = await db.from("vocabulary_pk_queue").update({ status: "cancelled" }).eq("queue_token", queueToken).eq("status", "waiting").select("status").maybeSingle();
      if (cancelled) return NextResponse.json({ status: "cancelled" });
      const { data: latest } = await db.from("vocabulary_pk_queue").select("status,match_id,queue_token,user_id").eq("queue_token", queueToken).maybeSingle();
      if (!latest) return jsonError("匹配请求已过期。", 404);
      row = latest;
    }
    if (action === "queue-state" && row.status === "waiting") {
      await db.from("vocabulary_pk_queue").update({ created_at: new Date(now).toISOString() }).eq("queue_token", queueToken).eq("status", "waiting");
    }
    return NextResponse.json({ status: row.status, matchId: row.match_id, playerToken: row.status === "matched" ? row.queue_token : null });
  }

  const playerToken = typeof payload.playerToken === "string" ? payload.playerToken : "";
  const { data: player } = await db.from("vocabulary_pk_players").select("*").eq("player_token", playerToken).maybeSingle();
  if (!player) return jsonError("比赛凭证无效，请重新进入挑战链接。", 401);
  if (player.user_id && (await memberFor(request, db))?.id !== player.user_id) return jsonError("请使用参赛账号继续比赛。", 401);
  const { data: match } = await db.from("vocabulary_pk_matches").select("*").eq("id", player.match_id).single();
  if (!match) return jsonError("比赛记录不存在。", 404);
  if (action === "cancel-invite") {
    if (player.seat_no !== 1 || match.status !== "waiting") return jsonError("这场比赛已经开始，无法取消。", 409);
    await db.from("vocabulary_pk_matches").update({ status: "cancelled" }).eq("id", match.id).eq("status", "waiting");
    return NextResponse.json({ status: "cancelled" });
  }
  if (action !== "state" && action !== "answer") return jsonError("未知请求。", 404);
  const questionNo = Number(payload.questionNo);
  const choice = Number(payload.choiceIndex);
  if (action === "answer" && (!Number.isInteger(questionNo) || questionNo < 0 || questionNo >= QUESTION_COUNT
    || payload.choiceIndex === null || !Number.isInteger(choice) || choice < 0 || choice > 3)) return jsonError("题号或选项无效。");
  const { data, error } = await db.rpc("vocabulary_pk_play", {
    p_player_token: playerToken, p_submit: action === "answer",
    p_question_no: action === "answer" ? questionNo : null, p_choice_index: action === "answer" ? choice : null,
  });
  if (error || !data) return jsonError("比赛状态暂时不可用，请稍后重试。", 500);
  return data.error ? jsonError(data.error, data.code ?? 400) : NextResponse.json(data);
}
