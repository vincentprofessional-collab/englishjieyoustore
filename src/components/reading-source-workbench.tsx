"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getReadingQuestionNumbers, type ReadingTest } from "@/lib/ielts/reading";
import { gradeSourceReading, type ReadingSourcePage } from "@/lib/ielts/reading-source-model";
import { getEditableReadingPart, type EditableQuestionBlock, type EditableQuestionItem, type EditableReadingPart } from "@/lib/ielts/reading-source-editable";
import { recordPracticeAttempt } from "@/lib/learning/site-progress";
import "@/app/reading/reading-source.css";

function SourcePages({ pages, label }: { pages: ReadingSourcePage[]; label: string }) {
  return <div className="reading-source-pages">{pages.map((page) => <figure key={page.src}>
    <a aria-label={`${label}，原PDF第${page.page}页，查看大图`} href={page.src} rel="noreferrer" target="_blank">
      <img alt={`${label}，原PDF第${page.page}页`} height={page.height} loading="lazy" src={page.src} width={page.width} />
    </a><figcaption>第 {page.page} 页</figcaption>
  </figure>)}</div>;
}

function EditableQuestionControl({ block, number, item, answers, onAnswer, disabled, locked, expected, correct }: {
  block: EditableQuestionBlock;
  number: number;
  item: Pick<EditableQuestionItem, "before" | "after" | "prompt" | "options">;
  answers: Record<number, string>;
  onAnswer: (number: number, value: string) => void;
  disabled: boolean;
  locked: boolean;
  expected: string;
  correct: boolean | null;
}) {
  const id = `reading-source-answer-${number}`;
  const status = locked ? correct === true ? "correct" : correct === false ? "incorrect" : "" : "";
  const control = block.response === "select" && item.options ? <div aria-label={`第 ${number} 题选项`} className="reading-source-radio-options" role="radiogroup">
    {item.options.map((option) => <label key={option.value}><input checked={answers[number] === option.value} disabled={disabled} name={id} onChange={() => onAnswer(number, option.value)} type="radio" value={option.value} /><span>{option.label}</span></label>)}
  </div> : block.response === "select" ? <select aria-label={`第 ${number} 题答案`} className="reading-source-text-select" disabled={disabled} id={id} onChange={(event) => onAnswer(number, event.target.value)} value={answers[number] ?? ""}>
    <option value="">请选择</option>
    {(item.options ?? block.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select> : <input aria-label={`第 ${number} 题答案`} autoComplete="off" className="reading-source-text-input" disabled={disabled} id={id} maxLength={140} onChange={(event) => onAnswer(number, event.target.value)} spellCheck={false} value={answers[number] ?? ""} />;
  return <div className={`reading-source-text-question ${status}`} id={`reading-source-question-${number}`}>
    <span className="reading-source-text-question-number">{number}</span>
    <div className="reading-source-text-question-body">
      {item.prompt ? <p>{item.prompt}</p> : null}
      {item.before !== undefined || item.after !== undefined ? <p className="reading-source-inline-answer"><span>{item.before}</span>{control}<span>{item.after}</span></p> : !item.prompt ? control : null}
      {locked ? <small>{correct === null ? "待核对" : correct ? "正确" : `参考：${expected}`}</small> : null}
    </div>
  </div>;
}

function EditableQuestionFlow({ block, answers, onAnswer, disabled, locked, rowsByNumber }: {
  block: EditableQuestionBlock;
  answers: Record<number, string>;
  onAnswer: (number: number, value: string) => void;
  disabled: boolean;
  locked: boolean;
  rowsByNumber: Map<number, ReturnType<typeof gradeSourceReading>[number]>;
}) {
  return <p className="reading-source-question-flow">{block.flow?.map((segment, index) => {
    if ("text" in segment) return <span key={`flow-${index}`}>{segment.text}</span>;
    const number = segment.question;
    const answer = rowsByNumber.get(number);
    const status = locked ? answer?.correct === true ? "correct" : answer?.correct === false ? "incorrect" : "" : "";
    const control = block.response === "select" ? <select aria-label={`第 ${number} 题答案`} className="reading-source-text-select" disabled={disabled} id={`reading-source-answer-${number}`} onChange={(event) => onAnswer(number, event.target.value)} value={answers[number] ?? ""}>
      <option value="">请选择</option>
      {(block.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select> : <input aria-label={`第 ${number} 题答案`} autoComplete="off" className="reading-source-text-input" disabled={disabled} id={`reading-source-answer-${number}`} maxLength={140} onChange={(event) => onAnswer(number, event.target.value)} spellCheck={false} value={answers[number] ?? ""} />;
    return <span className={`reading-source-flow-answer ${status}`} key={`flow-q${number}`}><span className="reading-source-table-question-number">{number}</span>{control}{locked ? <small>{answer?.correct === null || !answer ? "待核对" : answer.correct ? "正确" : `参考：${answer.expected}`}</small> : null}</span>;
  })}</p>;
}

function EditableQuestions({ part, partRows, answers, onAnswer, disabled, locked, rowsByNumber }: {
  part: EditableReadingPart;
  partRows: ReturnType<typeof gradeSourceReading>;
  answers: Record<number, string>;
  onAnswer: (number: number, value: string) => void;
  disabled: boolean;
  locked: boolean;
  rowsByNumber: Map<number, ReturnType<typeof gradeSourceReading>[number]>;
}) {
  return <div className="reading-source-editable-questions">
    {part.questionBlocks.map((block) => <section className="reading-source-question-block" key={block.id}>
      {block.title ? <h3>{block.title}</h3> : null}
      {block.directions.map((direction, index) => <p className={index === 0 ? "reading-source-direction lead" : "reading-source-direction"} key={`${block.id}-direction-${index}`}>{direction}</p>)}
      {block.wordBank ? <div aria-label="选项列表" className="reading-source-word-bank">{(block.options ?? []).map((option) => <span key={option.value}>{option.label}</span>)}</div> : null}
      {block.table ? <div className="reading-source-question-table-wrap"><table className="reading-source-question-table">
        <thead>{block.table.title ? <tr><th colSpan={block.table.columns.length}>{block.table.title}</th></tr> : null}<tr>{block.table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{block.table.rows.map((row, rowIndex) => <tr key={`${block.id}-row-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${block.id}-cell-${rowIndex}-${cellIndex}`}>{cell.map((segment, segmentIndex) => {
          if ("text" in segment) return <span key={`${rowIndex}-${cellIndex}-${segmentIndex}`}>{segment.text}</span>;
          const answer = rowsByNumber.get(segment.question);
          const status = locked ? answer?.correct === true ? "correct" : answer?.correct === false ? "incorrect" : "" : "";
          return <label className={`reading-source-table-answer ${status}`} key={`${rowIndex}-${cellIndex}-q${segment.question}`}><span className="reading-source-table-question-number">{segment.question}</span><input aria-label={`第 ${segment.question} 题答案`} autoComplete="off" disabled={disabled} maxLength={140} onChange={(event) => onAnswer(segment.question, event.target.value)} spellCheck={false} value={answers[segment.question] ?? ""} />{locked ? <small>{answer?.correct === null || !answer ? "待核对" : answer.correct ? "正确" : `参考：${answer.expected}`}</small> : null}</label>;
        })}</td>)}</tr>)}</tbody>
      </table></div> : null}
      {block.flow?.length ? <EditableQuestionFlow block={block} answers={answers} onAnswer={onAnswer} disabled={disabled} locked={locked} rowsByNumber={rowsByNumber} /> : null}
      {block.lines?.map((line, index) => line.kind === "heading"
        ? <h4 className="reading-source-note-heading" key={`${block.id}-line-${index}`}>{line.text}</h4>
        : line.kind === "text"
          ? <p className="reading-source-note-line" key={`${block.id}-line-${index}`}>• {line.text}</p>
          : <EditableQuestionControl key={`${block.id}-q-${line.number}`} block={block} number={line.number} item={line} answers={answers} onAnswer={onAnswer} disabled={disabled} locked={locked} expected={rowsByNumber.get(line.number)?.expected ?? ""} correct={rowsByNumber.get(line.number)?.correct ?? null} />)}
      {!block.flow?.length ? block.items?.map((item) => <EditableQuestionControl key={`${block.id}-q-${item.number}`} block={block} number={item.number} item={item} answers={answers} onAnswer={onAnswer} disabled={disabled} locked={locked} expected={rowsByNumber.get(item.number)?.expected ?? ""} correct={rowsByNumber.get(item.number)?.correct ?? null} />) : null}
    </section>)}
    {locked ? <p className="reading-source-result">{partRows.filter((row) => row.correct).length}/{partRows.length} 题已答对</p> : null}
  </div>;
}

function EditablePassage({ part }: { part: EditableReadingPart }) {
  return <div className="reading-source-editable-passage">
    {part.passageTitle ? <h2>{part.passageTitle}</h2> : null}
    <p className="reading-source-direction reading-source-passage-direction">{part.passageDirections}</p>
    {part.subtitle ? <p className="reading-source-subtitle">{part.subtitle}</p> : null}
    {part.sections.map((section, sectionIndex) => <section className="reading-source-passage-section" key={`${section.label ?? "passage"}-${sectionIndex}`}>
      {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>
        {section.label && paragraphIndex === 0 ? <strong className="reading-source-section-label">{section.label} </strong> : null}
        {paragraph}
      </p>)}
    </section>)}
    {part.footnotes?.length ? <footer className="reading-source-footnotes">{part.footnotes.map((footnote) => <p key={footnote}>{footnote}</p>)}</footer> : null}
  </div>;
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
  const editablePart = getEditableReadingPart(part.id);
  const partReady = Boolean(editablePart);
  const testReady = test.parts.every((item) => Boolean(getEditableReadingPart(item.id)));
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
    if ((mode === "mock" && !testReady) || (mode === "practice" && !partReady)) return;
    if (!startedAt) setStartedAt(Date.now());
    setDeadline(Date.now() + remaining * 1000);
  }
  function submit() {
    if (!partReady) return;
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
        {!deadline && !complete && remaining > 0 ? <button className="junior-high-submit" disabled={!hydrated || locked || (mode === "mock" ? !testReady : !partReady)} onClick={begin} type="button">{(mode === "mock" && !testReady) || (mode === "practice" && !partReady) ? "文字核对中" : startedAt ? "继续" : mode === "mock" ? "开始模考" : "开始练习"}</button> : null}
        {mode === "practice" && deadline ? <button onClick={() => setDeadline(null)} type="button">暂停</button> : null}
        <button className="annotation-toggle ielts-exam-action" onClick={() => void toggleFullscreen()} type="button">{fullscreen ? "退出全屏" : "全屏"}</button>
      </div>
    </div>
    <div className="reading-source-part-tabs" role="group" aria-label="阅读篇章">
      {test.parts.map((item) => <button aria-pressed={item.id === part.id} className={item.id === part.id ? "active" : ""} key={item.id} onClick={() => selectPart(item.id)} type="button">{item.label}<span>{getEditableReadingPart(item.id) ? `${getReadingQuestionNumbers(item).filter((n) => answers[n]?.trim()).length}/${getReadingQuestionNumbers(item).length}` : "文字待核"}</span>{submitted.includes(item.id) ? " 已提交" : ""}</button>)}
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
      <article aria-label={`${part.label} 阅读文章`} className="junior-high-passage-column reading-source-passage">
        <h2>{part.label} · 原文</h2>
        {editablePart ? <EditablePassage part={editablePart} /> : <div className="reading-source-pending" role="status"><strong>原文文字转录待核</strong><p>本篇尚未完成逐段文字核对，暂不开放练习。原卷页仅供编辑核查。</p></div>}
        <details className="reading-source-reference"><summary>查看原 PDF 页面（来源核对）</summary><SourcePages label={`${test.title} ${part.label} 原文`} pages={part.source!.passagePages} /></details>
      </article>
      <aside aria-label={`${part.label} 题目与作答`} className="junior-high-passage-questions reading-source-questions">
        {editablePart ? <>
          <EditableQuestions part={editablePart} partRows={partRows} answers={answers} onAnswer={(number, value) => setAnswers((current) => ({ ...current, [number]: value }))} disabled={locked || !startedAt || (mode === "mock" && !deadline)} locked={locked} rowsByNumber={new Map(rows.map((row) => [row.number, row]))} />
          {!locked ? <div className="junior-high-cloze-submit-row"><button disabled={!startedAt || !source.verified || (mode === "mock" && !deadline)} onClick={submit} type="button">{mode === "mock" ? "提交整卷" : "提交本篇"}</button></div> : null}
        </> : <div className="reading-source-pending" role="status"><strong>题面文字转录待核</strong><p>本篇题干、题号、选项和 Directions 尚未完成逐题文字核对，因此当前不能用原页图片代替题目作答。</p></div>}
        <details className="reading-source-reference"><summary>查看原 PDF 题目页（来源核对）</summary><SourcePages label={`${test.title} ${part.label} 题目`} pages={part.source!.questionPages} /></details>
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
