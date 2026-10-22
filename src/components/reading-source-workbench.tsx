"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getReadingQuestionNumbers, type ReadingTest } from "@/lib/ielts/reading";
import { gradeSourceReading, type ReadingSourcePage } from "@/lib/ielts/reading-source-model";
import { recordPracticeAttempt } from "@/lib/learning/site-progress";
import "@/app/reading/reading-source.css";

function SourcePages({ pages, label }: { pages: ReadingSourcePage[]; label: string }) {
  return <div className="reading-source-pages">{pages.map((page) => <figure key={page.src}>
    <a aria-label={`${label}，原PDF第${page.page}页，查看大图`} href={page.src} rel="noreferrer" target="_blank">
      <img alt={`${label}，原PDF第${page.page}页`} height={page.height} loading="lazy" src={page.src} width={page.width} />
    </a><figcaption>第 {page.page} 页</figcaption>
  </figure>)}</div>;
}

type SavedAttempt = { answers: Record<number, string>; submitted: string[]; deadline: number | null; remaining: number; startedAt: number };

export function ReadingSourceWorkbench({ mode, test }: { mode: "mock" | "practice"; test: ReadingTest }) {
  const source = test.source!;
  const [partId, setPartId] = useState(test.parts[0].id);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(mode === "mock" ? 3600 : 1200);
  const [startedAt, setStartedAt] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"passage" | "questions">("passage");
  const [notice, setNotice] = useState("");
  const pageRef = useRef<HTMLElement>(null);
  const committed = useRef(false);
  const storageKey = `ielts-platform.reading.attempt:${mode}:${test.id}`;
  const allNumbers = useMemo(() => test.parts.flatMap(getReadingQuestionNumbers), [test.parts]);
  const part = test.parts.find((item) => item.id === partId) ?? test.parts[0];
  const numbers = getReadingQuestionNumbers(part);
  const complete = submitted.length === test.parts.length;
  const locked = mode === "mock" ? complete : submitted.includes(part.id);
  const rows = useMemo(() => gradeSourceReading(allNumbers, source.answers, source.groups, answers), [allNumbers, source, answers]);
  const correct = rows.filter((row) => row.correct).length;
  const partRows = rows.filter((row) => numbers.includes(row.number));
  const href = `/reading/${mode}/${test.id}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as SavedAttempt;
        if (saved && typeof saved.answers === "object" && Array.isArray(saved.submitted)) {
          setAnswers(Object.fromEntries(Object.entries(saved.answers).filter(([n, value]) => allNumbers.includes(Number(n)) && typeof value === "string")));
          setSubmitted(saved.submitted.filter((id) => test.parts.some((part) => part.id === id)));
          setRemaining(Math.max(0, Number(saved.remaining) || 0));
          setDeadline(typeof saved.deadline === "number" ? saved.deadline : null);
          setStartedAt(Number(saved.startedAt) || 0);
          committed.current = saved.submitted.length === test.parts.length;
        }
      }
    } catch { /* A disabled or corrupt local store must not prevent a new attempt. */ }
    setHydrated(true);
  }, [storageKey, allNumbers, test.parts]);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify({ answers, submitted, deadline, remaining, startedAt })); } catch { /* Continue when local storage is unavailable. */ }
  }, [storageKey, hydrated, answers, submitted, deadline, remaining, startedAt]);

  useEffect(() => {
    if (!deadline || complete) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadline, complete]);

  useEffect(() => {
    if (mode === "mock" && hydrated && deadline && remaining === 0 && !complete) {
      setSubmitted(test.parts.map((part) => part.id));
      setDeadline(null);
      setNotice("模考时间已到，已自动提交作答。");
    }
  }, [mode, hydrated, deadline, remaining, complete, test.parts]);

  useEffect(() => {
    if (!complete || committed.current) return;
    committed.current = true;
    recordPracticeAttempt({ id: `reading:${test.id}:${mode}:${startedAt}`, title: `雅思阅读 · ${test.title}`, href, correct, total: allNumbers.length });
  }, [complete, test.id, test.title, mode, startedAt, href, correct, allNumbers.length]);

  useEffect(() => {
    const changed = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  function begin() {
    if (!startedAt) setStartedAt(Date.now());
    setDeadline(Date.now() + remaining * 1000);
  }
  function submit() {
    if (mode === "mock") {
      setSubmitted(test.parts.map((part) => part.id));
      setDeadline(null);
    } else {
      setSubmitted((current) => [...new Set([...current, part.id])]);
      setDeadline(null);
    }
    setNotice(mode === "mock" ? "模考已提交，可以核对答案。" : "本篇已提交，可以核对答案。");
  }
  async function toggleFullscreen() {
    if (fullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setFullscreen(false);
    } else {
      setFullscreen(true);
      await pageRef.current?.requestFullscreen?.().catch(() => undefined);
    }
  }
  function selectPart(id: string) {
    if (id === partId) return;
    setPartId(id);
    setNotice("");
    if (mode === "practice") { setDeadline(null); setRemaining(1200); }
  }

  return <section className={`stack junior-high-page junior-high-exam-page reading-source-workbench ${fullscreen ? "fullscreen" : ""}`} ref={pageRef}>
    <div className="junior-high-exam-toolbar">
      <Link className="junior-high-back" href={`/reading/${mode}`}>← 返回选择</Link>
      <div className="junior-high-exam-toolbar-title"><strong>{test.title}</strong><span>{mode === "mock" ? "完整模考" : "逐篇练习"}</span></div>
      <div aria-label="阅读考试计时" className={`junior-high-timer ${remaining <= 300 ? "is-over" : ""}`} role="timer">{`${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`}</div>
      <div className="junior-high-toolbar-actions">
        {!deadline && !complete && remaining > 0 ? <button className="junior-high-submit" disabled={!hydrated || locked} onClick={begin} type="button">{startedAt ? "继续" : mode === "mock" ? "开始模考" : "开始练习"}</button> : null}
        {mode === "practice" && deadline ? <button onClick={() => setDeadline(null)} type="button">暂停</button> : null}
        <button className="annotation-toggle ielts-exam-action" onClick={() => void toggleFullscreen()} type="button">{fullscreen ? "退出全屏" : "全屏"}</button>
      </div>
    </div>
    <div className="reading-source-part-tabs" role="group" aria-label="阅读篇章">
      {test.parts.map((item) => <button aria-pressed={item.id === part.id} className={item.id === part.id ? "active" : ""} key={item.id} onClick={() => selectPart(item.id)} type="button">{item.label}<span>{getReadingQuestionNumbers(item).filter((n) => answers[n]?.trim()).length}/{getReadingQuestionNumbers(item).length}</span>{submitted.includes(item.id) ? " 已提交" : ""}</button>)}
      <a download href={`/reading/sources/${test.id}.md`}>下载本卷 MD</a>
    </div>
    <nav aria-label="阅读题号导航" className="junior-high-paper-nav direct reading-source-navigation">
      {allNumbers.map((number) => {
        const row = rows.find((item) => item.number === number)!;
        const owner = test.parts.find((p) => getReadingQuestionNumbers(p).includes(number))!;
        const visible = mode === "mock" ? complete : submitted.includes(owner.id);
        return <button className={visible ? row.correct ? "correct" : "wrong" : row.user.trim() ? "answered" : ""} key={number} onClick={() => { selectPart(owner.id); setMobilePane("questions"); window.setTimeout(() => document.getElementById(`reading-source-answer-${number}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }} type="button">{number}</button>;
      })}
    </nav>
    <div className="reading-source-mobile-tabs"><button aria-pressed={mobilePane === "passage"} onClick={() => setMobilePane("passage")} type="button">文章</button><button aria-pressed={mobilePane === "questions"} onClick={() => setMobilePane("questions")} type="button">题目与作答</button></div>
    <div className={`junior-high-passage-layout junior-high-structured-reading-layout reading-source-layout show-${mobilePane}`}>
      <article aria-label={`${part.label} 阅读文章`} className="junior-high-passage-column reading-source-passage"><h2>{part.label} · 原文</h2><SourcePages label={`${test.title} ${part.label} 原文`} pages={part.source!.passagePages} /></article>
      <aside aria-label={`${part.label} 题目与作答`} className="junior-high-passage-questions reading-source-questions">
        <SourcePages label={`${test.title} ${part.label} 题目`} pages={part.source!.questionPages} />
        <section className="junior-high-question-card"><h2>作答区</h2><p>按原题要求填写单词、字母或判断答案。</p>
          <div className="reading-source-answer-grid">{partRows.map((row) => <label className={locked ? row.correct ? "correct" : row.correct === null ? "" : "incorrect" : ""} htmlFor={`reading-source-answer-${row.number}`} key={row.number}><span>{row.number}</span><input autoComplete="off" disabled={locked || !startedAt || (mode === "mock" && !deadline)} id={`reading-source-answer-${row.number}`} maxLength={140} onChange={(event) => setAnswers((current) => ({ ...current, [row.number]: event.target.value }))} spellCheck={false} value={answers[row.number] ?? ""} />{locked ? <small>{row.correct === null ? "待核对" : row.correct ? "正确" : `参考：${row.expected}`}</small> : null}</label>)}</div>
          {!locked ? <div className="junior-high-cloze-submit-row"><button disabled={!startedAt || !source.verified || (mode === "mock" && !deadline)} onClick={submit} type="button">{mode === "mock" ? "提交整卷" : "提交本篇"}</button></div> : <p className="reading-source-result">本篇 {partRows.filter((row) => row.correct).length}/{partRows.length}</p>}
        </section>
        {locked ? <details className="junior-high-analysis reading-source-analysis"><summary>{part.source!.analysisVerified ? "查看答案与解析" : "查看标准答案"}</summary>
          {part.source!.explanationAttribution ? <p className="reading-source-attribution">{part.source!.explanationAttribution}</p> : null}
          {partRows.map((row) => source.answers[row.number]?.explanation ? <section key={row.number}><strong>第 {row.number} 题</strong><p>{source.answers[row.number].explanation}</p></section> : null)}
          {part.source!.explanationPages?.length ? <SourcePages label={`${part.label} 解析`} pages={part.source!.explanationPages} /> : null}
          <h3>原始答案核对</h3><SourcePages label={`${part.label} 原始答案`} pages={part.source!.answerPages} />
        </details> : null}
      </aside>
    </div>
    {notice ? <p aria-live="polite" className="reading-source-notice">{notice}</p> : null}
    <footer><span>{complete ? `整卷得分 ${correct}/${allNumbers.length}` : `已作答 ${allNumbers.filter((n) => answers[n]?.trim()).length}/${allNumbers.length}`}</span><button className="junior-high-bottom-submit-button junior-high-bottom-reset-button" onClick={() => { if (window.confirm("重新开始会清空本卷作答，确定重新开始？")) { setAnswers({}); setSubmitted([]); setDeadline(null); setRemaining(mode === "mock" ? 3600 : 1200); setStartedAt(0); setNotice(""); committed.current = false; } }} type="button">重新开始</button></footer>
  </section>;
}
