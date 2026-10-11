"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import type { LearningBookKey } from "@/lib/vocabulary/learning";
import { createVocabularyPkAudio } from "@/lib/vocabulary/pk-audio";

type PkState = {
  matchId: string;
  status: "waiting" | "active" | "completed" | "cancelled";
  ranked: boolean;
  questionNo: number;
  totalQuestions: number;
  remainingMs: number;
  startsInMs: number;
  nextUpdateMs: number;
  question: { word: string; choices: string[]; correctIndex: number | null } | null;
  revealed: boolean;
  selectedIndex: number | null;
  answered: boolean;
  opponent: { name: string; avatar: string | null; answered: boolean; currentCorrect: boolean | null; correct: number; count: number; finished: boolean } | null;
  me: { correct: number; answered: number; points: number; result: string | null; finished: boolean };
};

type BoardRow = { rank: number; nickname: string; avatar: string | null; points: number; matches: number; wins: number; accuracy: number; tier?: string };
type PlayerProfile = { loggedIn: boolean; nickname?: string; avatar?: string | null; points?: number; matches?: number; wins?: number; questions?: number; accuracy?: number; winRate?: number; name?: string; highestName?: string };
type Props = { initialBook: LearningBookKey; initialChallenge: string; initialMode: string; initialWordIds: string[] };

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function pkPost<T>(payload: Record<string, unknown>) {
  const auth = await authHeader();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  Object.assign(headers, auth);
  const response = await fetch("/api/vocabulary-pk", {
    method: "POST", cache: "no-store", headers,
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "PK 服务暂时不可用。");
  return body as T;
}

export function VocabularyPk({ initialBook, initialChallenge, initialMode, initialWordIds }: Props) {
  const [stage, setStage] = useState<"choose" | "invite-consent" | "queue" | "waiting" | "playing" | "result">("choose");
  const [period, setPeriod] = useState("month");
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [game, setGame] = useState<PkState | null>(null);
  const [playerToken, setPlayerToken] = useState("");
  const [queueToken, setQueueToken] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [copyLabel, setCopyLabel] = useState("复制挑战链接");
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [rankedConsent, setRankedConsent] = useState(false);
  const [clockNow, setClockNow] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef<ReturnType<typeof createVocabularyPkAudio> | null>(null);
  const pronouncedQuestion = useRef("");
  const soundedAnswer = useRef("");
  const answerDeadlineRef = useRef(0);
  const autoStarted = useRef(false);
  const title = `${initialBook}词汇 PK`;

  useEffect(() => {
    const audio = createVocabularyPkAudio();
    audioRef.current = audio;
    let active = true;
    setAudioReady(audio.ready);
    const unlock = () => { void audio.unlock().then((ready) => { if (active) setAudioReady(ready); }); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      active = false;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.close();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!audioReady || !soundEnabled || stage !== "playing" || !game?.question || game.status !== "active" || game.startsInMs > 0 || game.revealed || game.me.finished) {
      audioRef.current?.stopWord();
      return;
    }
    const key = `${game.matchId}:${game.questionNo}`;
    if (pronouncedQuestion.current === key) return;
    pronouncedQuestion.current = key;
    void audioRef.current?.pronounce(game.question.word);
  }, [audioReady, game, soundEnabled, stage]);

  useEffect(() => {
    if (!audioReady || !soundEnabled || stage !== "playing" || !game?.revealed || game.question?.correctIndex == null) return;
    const key = `${game.matchId}:${game.questionNo}`;
    if (soundedAnswer.current === key) return;
    soundedAnswer.current = key;
    audioRef.current?.feedback(game.selectedIndex === game.question.correctIndex);
  }, [audioReady, game, soundEnabled, stage]);

  const toggleSound = async () => {
    if (soundEnabled && audioReady) {
      setSoundEnabled(false); audioRef.current?.stop();
    } else {
      const ready = await audioRef.current?.unlock();
      setAudioReady(Boolean(ready)); setSoundEnabled(true);
      pronouncedQuestion.current = "";
    }
  };

  const loadBoard = useCallback(async () => {
    const response = await fetch(`/api/vocabulary-pk?action=leaderboard&book=${encodeURIComponent(initialBook)}&period=${period}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok && Array.isArray(body.rows)) setRows(body.rows as BoardRow[]);
  }, [initialBook, period]);

  const loadProfile = useCallback(async () => {
    const headers: Record<string, string> = {};
    Object.assign(headers, await authHeader());
    const response = await fetch(`/api/vocabulary-pk?action=profile&book=${encodeURIComponent(initialBook)}`, { cache: "no-store", headers });
    const body = await response.json().catch(() => null);
    if (response.ok && body) setProfile(body as PlayerProfile);
  }, [initialBook]);

  useEffect(() => { void loadBoard(); void loadProfile(); }, [loadBoard, loadProfile]);

  const beginInvite = useCallback(async () => {
    setBusy(true); setError("");
    try {
      setStage("waiting");
      setQueueToken("");
      if (queueToken) {
        const queueResult = await pkPost<{ status: string; playerToken?: string }>({ action: "cancel-queue", queueToken });
        if (queueResult.status === "matched" && queueResult.playerToken) {
          setPlayerToken(queueResult.playerToken);
          setStage("playing");
          return;
        }
      }
      const result = await pkPost<{ matchId: string; inviteToken: string; playerToken: string; ranked: boolean }>({ action: "create-invite", bookKey: initialBook, wordIds: initialWordIds.length ? initialWordIds : undefined, rankedConsent });
      setPlayerToken(result.playerToken);
      setInviteUrl(`${window.location.origin}/vocabulary/pk?book=${encodeURIComponent(initialBook)}&challenge=${result.inviteToken}`);
      setStage("waiting");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "创建挑战失败。"); }
    finally { setBusy(false); }
  }, [initialBook, initialWordIds, queueToken, rankedConsent]);

  const joinChallenge = useCallback(async (consent: boolean) => {
    if (!initialChallenge) return;
    setBusy(true); setError("");
    try {
      const result = await pkPost<{ matchId: string; playerToken: string; ranked: boolean }>({ action: "join-invite", inviteToken: initialChallenge, rankedConsent: consent });
      window.sessionStorage.setItem(`vocabulary-pk-guest:${initialChallenge}`, result.playerToken);
      setPlayerToken(result.playerToken); setStage("playing");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "进入挑战失败。"); }
    finally { setBusy(false); }
  }, [initialChallenge]);

  const beginQueue = useCallback(async () => {
    setBusy(true); setError(""); setWaitingSeconds(0); setInviteUrl(""); setPlayerToken(""); setQueueToken(""); setStage("queue");
    try {
      const result = await pkPost<{ status: string; queueToken?: string; playerToken?: string; matchId?: string }>({
        action: "queue", bookKey: initialBook, wordIds: initialWordIds.length ? initialWordIds : undefined,
      });
      if (result.status === "matched" && result.playerToken) {
        setPlayerToken(result.playerToken); setStage("playing");
      } else {
        setQueueToken(result.queueToken ?? ""); setStage("queue");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "匹配失败。"); setStage("choose"); }
    finally { setBusy(false); }
  }, [initialBook, initialWordIds]);

  useEffect(() => {
    if (autoStarted.current) return;
    if (initialChallenge) {
      autoStarted.current = true;
      const previousToken = window.sessionStorage.getItem(`vocabulary-pk-guest:${initialChallenge}`);
      if (previousToken) {
        setPlayerToken(previousToken);
        setStage("playing");
        return;
      }
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) setStage("invite-consent");
        else void joinChallenge(false);
      });
    } else if (initialMode === "auto") {
      autoStarted.current = true;
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) void beginQueue();
        else void beginInvite();
      });
    }
  }, [beginInvite, beginQueue, initialChallenge, initialMode, joinChallenge]);

  useEffect(() => {
    if (stage === "queue" && queueToken && waitingSeconds >= 30 && !busy) void beginInvite();
  }, [beginInvite, busy, queueToken, stage, waitingSeconds]);

  useEffect(() => {
    if (!queueToken || stage !== "queue") return;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const result = await pkPost<{ status: string; matchId?: string; playerToken?: string }>({ action: "queue-state", queueToken });
        if (result.status === "matched" && result.playerToken) {
          setPlayerToken(result.playerToken); setStage("playing"); return;
        }
      } catch (cause) { setError(cause instanceof Error ? cause.message : "匹配状态读取失败。"); }
      if (!stopped) window.setTimeout(poll, 1200);
    };
    void poll();
    return () => { stopped = true; };
  }, [queueToken, stage]);

  useEffect(() => {
    if (stage !== "queue" && stage !== "waiting") return;
    const timer = window.setInterval(() => setWaitingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (!playerToken || !["waiting", "playing"].includes(stage)) return;
    let stopped = false;
    let timer = 0;
    const poll = async () => {
      try {
        const next = await pkPost<PkState>({ action: "state", playerToken });
        if (stopped) return;
        setGame(next);
        answerDeadlineRef.current = performance.now() + next.remainingMs;
        setClockNow(performance.now());
        if (next.status === "active") setStage("playing");
        else if (next.status === "completed") { setStage("result"); void loadBoard(); void loadProfile(); }
        else if (next.status === "cancelled") { setPlayerToken(""); setStage("choose"); setError("挑战已结束，请重新开始。"); }
        if (!stopped) timer = window.setTimeout(poll, Math.min(1500, Math.max(200, (next.nextUpdateMs ?? 1500) + 30)));
        return;
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : "比赛状态读取失败。");
      }
      if (!stopped) timer = window.setTimeout(poll, 1500);
    };
    void poll();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [loadBoard, loadProfile, playerToken, stage]);

  useEffect(() => {
    if (stage !== "playing") return;
    const timer = window.setInterval(() => setClockNow(performance.now()), 100);
    return () => window.clearInterval(timer);
  }, [stage]);

  const remaining = Math.max(0, answerDeadlineRef.current - clockNow);
  const timeLabel = (remaining / 1000).toFixed(1);
  const startAnswer = async (choiceIndex: number) => {
    if (!playerToken || !game || game.answered || game.revealed || busy || game.status !== "active") return;
    setBusy(true);
    setGame((current) => current ? { ...current, answered: true, selectedIndex: choiceIndex } : current);
    try {
      await pkPost({ action: "answer", playerToken, questionNo: game.questionNo, choiceIndex });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "提交答案失败。");
      setGame((current) => current ? { ...current, answered: false, selectedIndex: null } : current);
    } finally { setBusy(false); }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyLabel("已复制");
      window.setTimeout(() => setCopyLabel("复制挑战链接"), 1800);
    } catch { setCopyLabel("请复制下方链接"); }
  };

  const leaveQueue = async () => {
    if (queueToken) {
      const result = await pkPost<{ status: string; playerToken?: string }>({ action: "cancel-queue", queueToken }).catch(() => null);
      if (result?.status === "matched" && result.playerToken) { setQueueToken(""); setPlayerToken(result.playerToken); setStage("playing"); return; }
    }
    setQueueToken(""); setStage("choose");
  };

  const leaveInvite = async () => {
    if (playerToken) await pkPost({ action: "cancel-invite", playerToken }).catch(() => undefined);
    setPlayerToken(""); setInviteUrl(""); setStage("choose");
  };

  const resultLine = useMemo(() => {
    if (!game || game.status !== "completed") return "";
    if (game.me.result === "win") return "本场胜利";
    if (game.me.result === "loss") return "本场惜败";
    return "本场平局";
  }, [game]);

  return (
    <main className="vocabulary-pk-page">
      <header className="vocabulary-pk-header">
        <Link href={`/vocabulary/books?level=${encodeURIComponent(initialBook)}`}>‹ 返回背单词</Link>
        <div><span>词汇书对战</span><h1>{title}</h1></div>
        <div className="vocabulary-pk-header-controls"><span className="vocabulary-pk-header-badge">20 题 · 每题 10 秒</span><button aria-pressed={soundEnabled && audioReady} className="vocabulary-pk-sound-button" onClick={() => void toggleSound()} type="button">{soundEnabled && audioReady ? "声音已开启" : "开启声音"}</button></div>
      </header>
      <div className="vocabulary-pk-layout">
        <section className="vocabulary-pk-main">
          {stage === "choose" ? (
            <div className="vocabulary-pk-card vocabulary-pk-choice">
              <span className="vocabulary-pk-kicker">DUEL MODE</span>
              <h2>准备好和同段位的词友较量了吗？</h2>
              <p>每题 10 秒，从 4 个释义中选出正确答案。答对得 20 分，超时不扣分。PK 只考选项，不显示例句。</p>
              <div className="vocabulary-pk-action-grid">
                <button className="primary" disabled={busy} onClick={() => void beginQueue()} type="button"><strong>同段位自动匹配</strong><small>与该词汇书在线玩家捉对比赛</small></button>
                <button disabled={busy} onClick={() => void beginInvite()} type="button"><strong>创建挑战链接</strong><small>发给同学或访客，点击即可加入</small></button>
              </div>
              <label className="vocabulary-pk-consent"><input checked={rankedConsent} onChange={(event) => setRankedConsent(event.target.checked)} type="checkbox" />创建链接时同意计入排位；对手也需同意，访客赛始终只统计成绩</label>
              {error ? <p className="vocabulary-pk-error" role="alert">{error}</p> : null}
            </div>
          ) : null}

          {stage === "invite-consent" ? (
            <div className="vocabulary-pk-card vocabulary-pk-choice vocabulary-pk-invite-consent">
              <span className="vocabulary-pk-kicker">接受挑战</span>
              <h2>加入这场词汇 PK</h2>
              <p>你可以进行友谊赛，也可以在双方都同意时计入本词汇书积分与段位。</p>
              <div className="vocabulary-pk-action-grid">
                <button disabled={busy} onClick={() => void joinChallenge(false)} type="button"><strong>参加友谊赛</strong><small>只显示本场成绩</small></button>
                <button className="primary" disabled={busy} onClick={() => void joinChallenge(true)} type="button"><strong>同意计入排位</strong><small>双方都同意后累计积分</small></button>
              </div>
              {error ? <p className="vocabulary-pk-error" role="alert">{error}</p> : null}
            </div>
          ) : null}

          {stage === "queue" ? (
            <div className="vocabulary-pk-card vocabulary-pk-waiting">
              <div className="vocabulary-pk-search-orbit" aria-hidden="true">⚔</div>
              <h2>正在寻找同段位的对手</h2>
              <p>已等待 {waitingSeconds} 秒 · 匹配到对手后自动进入比赛</p>
              {waitingSeconds >= 20 ? <>
                <label className="vocabulary-pk-consent"><input checked={rankedConsent} onChange={(event) => setRankedConsent(event.target.checked)} type="checkbox" />邀请登录用户时，双方同意即可计入本书排位；访客赛只统计成绩</label>
                <button className="primary" onClick={() => void beginInvite()} type="button">暂时没有在线对手，生成挑战链接</button>
              </> : null}
              <button className="text-button" onClick={() => void leaveQueue()} type="button">取消匹配</button>
              {error ? <p className="vocabulary-pk-error" role="alert">{error}</p> : null}
            </div>
          ) : null}

          {stage === "waiting" ? (
            <div className="vocabulary-pk-card vocabulary-pk-waiting">
              <span className="vocabulary-pk-kicker">挑战已创建</span>
              <h2>把链接发给对手</h2>
              <p>对方打开后无需注册即可进入。访客比赛只显示成绩，不累计积分和段位。</p>
              <div className="vocabulary-pk-invite-row"><input aria-label="PK挑战链接" readOnly value={inviteUrl} /><button className="primary" onClick={() => void copyInvite()} type="button">{copyLabel}</button></div>
              {!inviteUrl ? <p className="vocabulary-pk-error">{error || "正在创建挑战链接……"}</p> : <p className="vocabulary-pk-live-note">等待对手进入后自动开始 · 已等待 {waitingSeconds} 秒</p>}
              <button className="text-button" onClick={() => void leaveInvite()} type="button">结束等待</button>
            </div>
          ) : null}

          {stage === "playing" && game ? (
            <div className="vocabulary-pk-card vocabulary-pk-game">
              <div className="vocabulary-pk-versus">
                <div className="vocabulary-pk-player"><span className="vocabulary-pk-avatar">我</span><strong>我</strong><small>答对 {game.me.correct} 题</small></div>
                <span className="vocabulary-pk-versus-mark">VS</span>
                <div className="vocabulary-pk-player"><Avatar name={game.opponent?.name ?? "等待对手"} src={game.opponent?.avatar ?? null} /><strong>{game.opponent?.name ?? "等待对手"}</strong><small>{game.opponent ? `答题 ${game.opponent.count}/20 · 答对 ${game.opponent.correct}` : "等待对手进入"}</small><em>{game.opponent?.finished ? "已完成" : game.opponent?.answered ? game.revealed ? `本题${game.opponent.currentCorrect ? "正确" : "错误"}` : "本题已答" : "本题未答"}</em></div>
              </div>
              {game.status === "waiting" ? (
                <div className="vocabulary-pk-wait-inline"><h2>挑战已创建，等待对手进入</h2>{inviteUrl ? <button className="primary" onClick={() => void copyInvite()} type="button">{copyLabel}</button> : null}</div>
              ) : game.startsInMs > 0 ? (
                <div className="vocabulary-pk-wait-inline"><h2>对手已就位，比赛即将开始</h2><p>每题 10 秒，两人同时作答。</p></div>
              ) : game.me.finished ? (
                <div className="vocabulary-pk-wait-inline"><h2>你已完成 20 题</h2><p>答对 {game.me.correct} 题，正在等待对手完成。</p><p>答对 +20 分 · 超时不扣分</p></div>
              ) : (
                <>
                  <div className="vocabulary-pk-question-meta"><span>第 {game.questionNo + 1} / 20 题</span><strong className={remaining <= 3000 ? "urgent" : ""}>{game.revealed ? "答案揭晓" : `${timeLabel} 秒`}</strong></div>
                  <div className="vocabulary-pk-timer"><span style={{ width: `${Math.max(0, Math.min(100, remaining / 10000 * 100))}%` }} /></div>
                  <h2 className="vocabulary-pk-word">{game.question?.word ?? "本场已完成"}</h2>
                  <div className="vocabulary-pk-options">
                    {(game.question?.choices ?? []).map((choice, index) => {
                      const correct = game.revealed && index === game.question?.correctIndex;
                      const wrong = game.revealed && index === game.selectedIndex && !correct;
                      const selected = index === game.selectedIndex;
                      return <button aria-pressed={selected} className={`${correct ? "correct" : ""} ${wrong ? "wrong" : ""} ${selected ? "selected" : ""}`} disabled={game.answered || game.revealed || busy} key={`${game.questionNo}-${index}`} onClick={() => void startAnswer(index)} type="button"><span>{choice}</span>{correct ? <strong>正确</strong> : selected && game.answered ? <strong>已提交</strong> : null}</button>;
                    })}
                  </div>
                  <p className="vocabulary-pk-live-note">{game.revealed ? "正确释义已高亮，马上进入下一题。" : game.answered ? "已提交，等待本题 10 秒结束后公布释义。" : "答对 +20 分 · 超时 0 分"}</p>
                  {!game.ranked ? <p className="vocabulary-pk-unranked">本场有访客参加，仅统计成绩，不计积分和段位</p> : null}
                </>
              )}
            </div>
          ) : null}

          {stage === "result" && game ? (
            <div className="vocabulary-pk-card vocabulary-pk-result">
              <span className="vocabulary-pk-kicker">MATCH COMPLETE</span>
              <h2>{resultLine}</h2>
              <div className="vocabulary-pk-final-score"><div><span>我答对</span><strong>{game.me.correct}<small> / 20</small></strong></div><span>—</span><div><span>{game.opponent?.name ?? "对手"}答对</span><strong>{game.opponent?.correct ?? 0}<small> / 20</small></strong></div></div>
              <p>{game.ranked ? `本场获得 ${game.me.points} 积分 · 已计入「${initialBook}」词汇书排名` : "友谊赛 · 本场只保留成绩统计，不累计积分和段位"}</p>
              <div className="vocabulary-pk-result-actions"><button className="primary" onClick={() => { setGame(null); setPlayerToken(""); setInviteUrl(""); setQueueToken(""); setStage("choose"); }} type="button">再来一场</button><Link href={`/vocabulary/books?level=${encodeURIComponent(initialBook)}`}>返回词汇书</Link></div>
            </div>
          ) : null}
          {busy && stage === "choose" ? <p className="vocabulary-pk-loading">正在准备……</p> : null}
          {error && stage !== "choose" && stage !== "queue" ? <p className="vocabulary-pk-error" role="alert">{error}</p> : null}
        </section>

        <aside className="vocabulary-pk-board">
          <div className="vocabulary-pk-board-head"><div><span>本书荣誉榜</span><h2>{initialBook}积分榜</h2></div><span>TOP 100</span></div>
          <div className="vocabulary-pk-my-rank">{profile?.loggedIn ? <><span>我的段位</span><strong>{profile.name ?? "青铜"}</strong><small>{Number(profile.points ?? 0).toLocaleString()} 积分 · 答题 {profile.questions ?? 0} 题</small><small>胜率 {profile.winRate ?? 0}% · 正确率 {profile.accuracy ?? 0}%</small><small>历史最高：{profile.highestName ?? "青铜"}</small></> : <><strong>登录后开启积分排位</strong><small>访客可参加挑战赛并查看本场成绩</small></>}</div>
          <div aria-label="积分榜周期" className="vocabulary-pk-periods" role="tablist">
            {[['month', '月榜'], ['quarter', '季榜'], ['year', '年榜']].map(([key, label]) => <button aria-selected={period === key} className={period === key ? "active" : ""} key={key} onClick={() => setPeriod(key)} role="tab" type="button">{label}</button>)}
          </div>
          <ol className="vocabulary-pk-board-list">
            {rows.length ? rows.map((row) => <li key={`${row.rank}-${row.nickname}`}><b className={`rank-${row.rank}`}>{row.rank}</b><Avatar name={row.nickname} src={row.avatar} /><span><strong>{row.nickname}</strong><small>{row.tier ?? `${row.wins} 胜 · ${row.accuracy}%`}</small></span><em>{Number(row.points).toLocaleString()}</em></li>) : <li className="vocabulary-pk-board-empty">本周期还没有积分记录，来拿下榜首吧。</li>}
          </ol>
          <details className="vocabulary-pk-rank-rules">
            <summary>查看段位晋级条件</summary>
            <p>积分、答题量、正确率和胜率需同时达标；平局按半场胜利计算胜率。当前段位随累计成绩调整，并保留历史最高段位。</p>
            <ul>
              <li><b>白银</b><span>200 题 · 2,500 分 · 正确率 55% · 胜率 40%</span></li>
              <li><b>黄金</b><span>400 题 · 6,500 分 · 正确率 60% · 胜率 45%</span></li>
              <li><b>铂金</b><span>800 题 · 13,000 分 · 正确率 65% · 胜率 50%</span></li>
              <li><b>钻石</b><span>1,200 题 · 24,000 分 · 正确率 70% · 胜率 55%</span></li>
              <li><b>至尊星耀</b><span>1,600 题 · 40,000 分 · 正确率 80% · 胜率 60%</span></li>
              <li><b>最强王者</b><span>2,000 题 · 60,000 分 · 正确率 95% · 胜率 70%</span></li>
            </ul>
          </details>
          <p className="vocabulary-pk-board-foot">只展示登录用户的排位赛成绩；月、季、年榜按本词汇书的比赛积分统计。</p>
        </aside>
      </div>
    </main>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src ? <img alt="" className="vocabulary-pk-avatar" src={src} /> : <span aria-hidden="true" className="vocabulary-pk-avatar">{name.slice(0, 1) || "友"}</span>;
}
