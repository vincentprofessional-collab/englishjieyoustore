"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./sat.module.css";
import type { SatContentBlock, SatProgress, SatQuestion, SatSet } from "@/lib/sat/types";

const PROGRESS_PREFIX = "sat-progress:v1:";
const QUESTION_NAV_GROUPS_PER_ROW = 9;

function emptyProgress(): SatProgress {
  return { answers: {}, graded: {}, submitted: {}, currentIndex: 0, expanded: {} };
}

function readProgress(setId: string): SatProgress {
  try {
    const value = JSON.parse(window.localStorage.getItem(`${PROGRESS_PREFIX}${setId}`) || "null") as Partial<SatProgress> | null;
    return { answers: value?.answers || {}, graded: value?.graded || {}, submitted: value?.submitted || {}, currentIndex: value?.currentIndex || 0, expanded: value?.expanded || {} };
  } catch {
    return emptyProgress();
  }
}

function saveProgress(setId: string, progress: SatProgress) {
  window.localStorage.setItem(`${PROGRESS_PREFIX}${setId}`, JSON.stringify(progress));
  window.dispatchEvent(new Event("sat-progress-updated"));
}

function isCorrect(question: SatQuestion, answer?: string) {
  return Boolean(answer) && answer === question.correctAnswer;
}

function BlockRenderer({ blocks }: { blocks: SatContentBlock[] }) {
  return <>{blocks.map((block, index) => {
    const key = `${block.type}-${index}`;
    if (block.type === "paragraph") return <p key={key}>{block.text}</p>;
    if (block.type === "quote") return <blockquote key={key}>{block.text}</blockquote>;
    if (block.type === "notes") return <ul className={styles.notes} key={key}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>;
    if (block.type === "twoText") return <div className={styles.twoText} key={key}>{block.texts.map((text) => <section className={styles.textPanel} key={text.label}><h3>{text.label}</h3><div className={styles.content}><BlockRenderer blocks={text.blocks} /></div></section>)}</div>;
    if (block.type === "table") return block.asset ? <figure className={styles.figure} key={key}><img alt={block.title || "SAT source table"} src={block.asset} /></figure> : null;
    if (block.type !== "figure") return null;
    return block.asset ? <figure className={styles.figure} key={key}><img alt={block.title || "SAT source figure"} src={block.asset} /></figure> : null;
  })}</>;
}

function QuestionNavigation({ questions, answers, submitted, focusedQuestionId, onSelect }: { questions: SatQuestion[]; answers: SatProgress["answers"]; submitted: SatProgress["submitted"]; focusedQuestionId: string | null; onSelect: (questionId: string) => void }) {
  const [openRange, setOpenRange] = useState<number | null>(null);
  const questionStatus = (question: SatQuestion) => {
    const answer = answers[question.id];
    if (!answer) return "";
    return submitted[question.id] ? (isCorrect(question, answer) ? styles.correct : styles.incorrect) : styles.answered;
  };
  const renderQuestion = (question: SatQuestion, index: number) => {
    const answer = answers[question.id];
    const isSubmitted = Boolean(submitted[question.id]);
    const result = isSubmitted && answer ? (isCorrect(question, answer) ? styles.correct : styles.incorrect) : "";
    return <button aria-current={question.id === focusedQuestionId ? "step" : undefined} className={`${question.id === focusedQuestionId ? styles.current : ""} ${answer ? styles.answered : ""} ${result}`} key={question.id} onClick={() => onSelect(question.id)} type="button">{index + 1}</button>;
  };
  if (questions.length < 100) return <nav aria-label="题号导航" className={`${styles.questionNav} ${styles.direct} ${styles.top}`}>{questions.map(renderQuestion)}</nav>;
  const ranges: Array<{ start: number; end: number; first: number; last: number }> = [];
  for (let start = 0; start < questions.length; start += 50) {
    const end = Math.min(start + 50, questions.length);
    ranges.push({ start, end, first: start + 1, last: end });
  }
  const expandedRange = openRange === null ? null : ranges[openRange];
  const rangeRows = Array.from({ length: Math.ceil(ranges.length / QUESTION_NAV_GROUPS_PER_ROW) }, (_, rowIndex) => ranges.slice(rowIndex * QUESTION_NAV_GROUPS_PER_ROW, (rowIndex + 1) * QUESTION_NAV_GROUPS_PER_ROW));
  return <nav aria-label="题号导航" className={`${styles.questionNav} ${styles.top}`}><div className={styles.questionNavGroups}>{rangeRows.map((row, rowIndex) => <div className={`${styles.questionNavGroupRow} ${row.length < QUESTION_NAV_GROUPS_PER_ROW ? styles.sparse : ""}`} key={`range-row-${rowIndex}`}>{row.map((range) => { const rangeIndex = ranges.indexOf(range); const expanded = openRange === rangeIndex; return <button aria-expanded={expanded} className={styles.questionNavGroupToggle} key={`${range.start}-${range.end}`} onClick={() => setOpenRange((current) => current === rangeIndex ? null : rangeIndex)} type="button">{range.first}-{range.last}</button>; })}</div>)}</div>{expandedRange ? <div aria-label={`${expandedRange.first}-${expandedRange.last}题号`} className={styles.questionNavGroupItems}>{questions.slice(expandedRange.start, expandedRange.end).map((question, index) => renderQuestion(question, expandedRange.start + index))}</div> : null}</nav>;
}

function Feedback({ question, answer, submitted }: { question: SatQuestion; answer?: string; submitted: boolean }) {
  if (!submitted) return null;
  const correct = Boolean(answer) && isCorrect(question, answer);
  const choiceRationales = question.choiceRationales || {};
  return <section aria-live="polite" className={`${styles.feedback} ${!answer || correct ? styles.correct : styles.incorrect}`}><div className={styles.explanation}><div><h3>Correct option rationale</h3><p>{choiceRationales[question.correctAnswer] || question.rationale}</p></div><ul className={styles.rationaleList}>{(["A", "B", "C", "D"] as const).filter((id) => id !== question.correctAnswer).map((id) => <li key={id}><strong>Choice {id}</strong><p>{choiceRationales[id] || "See the complete rationale below."}</p></li>)}</ul></div></section>;
}

export function SatPracticeRunner({ setId }: { setId: string }) {
  const [data, setData] = useState<SatSet | null>(null);
  const [progress, setProgress] = useState<SatProgress>(emptyProgress);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const storageKey = `${PROGRESS_PREFIX}${setId}`;

  useEffect(() => {
    fetch(`/sat/sets/${setId}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<SatSet>;
      })
      .then(setData)
      .catch(() => setError("这套 SAT 题组暂时无法载入，请返回后重试。"));
    setProgress(readProgress(setId));
    setRestored(true);
  }, [setId]);

  useEffect(() => {
    if (restored) saveProgress(setId, progress);
  }, [progress, restored, setId]);

  const questions = data?.questions || [];

  const updateProgress = (next: Partial<SatProgress>) => setProgress((current) => ({ ...current, ...next }));
  const choose = (question: SatQuestion, answer: SatQuestion["correctAnswer"]) => {
    const nextGraded = { ...progress.graded };
    delete nextGraded[question.id];
    updateProgress({ answers: { ...progress.answers, [question.id]: answer }, graded: nextGraded, submitted: { ...progress.submitted, [question.id]: false } });
    setFocusedQuestionId(question.id);
  };
  const submitQuestion = (questionId: string) => {
    const question = questions.find((item) => item.id === questionId);
    const answer = question && progress.answers[question.id];
    if (!question || !answer) return;
    updateProgress({ submitted: { ...progress.submitted, [question.id]: true }, graded: { ...progress.graded, [question.id]: isCorrect(question, answer) ? "correct" : "incorrect" }, expanded: { ...progress.expanded, [question.id]: true } });
    setFocusedQuestionId(question.id);
  };
  const submitAll = () => {
    const nextSubmitted = { ...progress.submitted };
    const nextGraded = { ...progress.graded };
    const nextExpanded = { ...progress.expanded };
    questions.forEach((question) => {
      const answer = progress.answers[question.id];
      nextSubmitted[question.id] = true;
      nextExpanded[question.id] = true;
      if (answer) nextGraded[question.id] = isCorrect(question, answer) ? "correct" : "incorrect";
      else delete nextGraded[question.id];
    });
    updateProgress({ submitted: nextSubmitted, graded: nextGraded, expanded: nextExpanded });
  };
  const selectQuestion = (questionId: string) => {
    const index = questions.findIndex((item) => item.id === questionId);
    if (index < 0) return;
    updateProgress({ currentIndex: index });
    setFocusedQuestionId(questionId);
    document.getElementById(`sat-question-${questionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const reset = () => {
    if (!window.confirm("只清除这一 SAT 题组的作答和解析状态吗？")) return;
    window.localStorage.removeItem(storageKey);
    // Keep the shared favorite-question storage untouched so saved wrong questions survive a redo.
    setProgress(emptyProgress());
    setFocusedQuestionId(null);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      // Fullscreen may be unavailable in an embedded preview.
    }
  };

  if (error) return <section className={styles.root}><div className={styles.error}>{error}</div></section>;
  if (!data || !questions.length) return <section className={`${styles.root} ${styles.practice}`}><div className={styles.loading}>正在载入题组…</div></section>;

  return <section className={`${styles.root} ${styles.practice}`} ref={rootRef}>
    <header className={styles.toolbar}><Link className={styles.back} href="/sat">← 返回</Link><div className={styles.toolbarTitle}><strong><span>{data.domain} · {data.skill}</span><span>{data.difficulty}</span></strong></div><div className={styles.toolbarActions}><button className={styles.toolButton} onClick={submitAll} type="button">提交</button><button className={styles.toolButton} onClick={reset} type="button">重做</button><button className={styles.toolButton} onClick={() => void toggleFullscreen()} type="button">全屏</button></div></header>
    <QuestionNavigation answers={progress.answers} focusedQuestionId={focusedQuestionId} onSelect={selectQuestion} questions={questions} submitted={progress.submitted} />
    <div className={styles.questionWrap}>{questions.map((question, index) => { const answer = progress.answers[question.id]; const submitted = Boolean(progress.submitted[question.id]); return <article className={styles.questionCard} id={`sat-question-${question.id}`} key={question.id} onClick={() => setFocusedQuestionId(question.id)}><div className={styles.questionMeta}><strong>Question {index + 1}</strong><span className={styles.meta}>{question.id}</span><span className={styles.meta}>{question.difficulty}</span></div><div className={styles.content}><BlockRenderer blocks={question.contentBlocks} /></div><p className={styles.prompt}>{question.prompt}</p><div className={styles.choices}>{question.choices.map((choice) => { const selected = answer === choice.id; const right = submitted && choice.id === question.correctAnswer; const wrong = submitted && selected && !right; return <button aria-pressed={selected} className={`${styles.choice} ${selected ? styles.selected : ""} ${right ? styles.correct : ""} ${wrong ? styles.incorrect : ""}`} key={choice.id} onClick={(event) => { event.stopPropagation(); choose(question, choice.id); }} type="button"><span className={styles.choiceLabel}>{choice.id}.</span><span className={styles.choiceText}>{choice.text}</span>{right ? <span className={styles.choiceMark}>✓</span> : null}{wrong ? <span className={styles.choiceMark}>✕</span> : null}</button>; })}</div><Feedback answer={answer} question={question} submitted={submitted} /><div className={styles.questionActions}><button className={styles.submitButton} disabled={!answer || submitted} onClick={(event) => { event.stopPropagation(); submitQuestion(question.id); }} type="button">{submitted ? "已提交" : "提交"}</button></div></article>; })}</div>
  </section>;
}
