"use client";

import Link from "next/link";
import { VocabularyMobileBackLink } from "@/components/vocabulary-mobile-back-link";
import { ExamPrepQuestionAdmin } from "@/components/exam-prep/exam-prep-question-admin";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { applyExamPrepQuestionOverrides, loadExamPrepQuestionOverrides, type ExamPrepQuestionOverrideState } from "@/lib/exam-prep/question-overrides";
import styles from "./exam-prep-runner.module.css";

type ExamId = "postgraduate" | "gre" | "gmat";
type Option = { label: string; text: string };
type QuestionTable = { headers: string[]; rows: string[][] };
type Question = {
  id?: string; number: number; label?: string; stem?: string; prompt?: string; options?: Option[]; answer?: string | null;
  answerMode?: string; explanation?: string; reviewRequired?: boolean; reviewNote?: string; table?: QuestionTable;
  source?: { file?: string; answerFile?: string; corroboratingFile?: string; corroboratingPage?: number; page?: number; section?: number; passage?: number };
  group?: string; difficulty?: string; passage?: string; passageTitle?: string;
};
type Passage = { title?: string; text?: string; questions: Question[] };
type Section = { title: string; kind?: string; directions?: string; source?: string; passage?: string; questions: Question[]; passages?: Passage[] };
type ExamSet = { id: string; exam: ExamId; title: string; category?: string; kind?: string; mode?: string; unitLabel?: string; questionCount: number; sections?: Section[]; questions?: Question[]; answerKeyText?: string; explanationText?: string; quality?: { reviewQuestionNumbers?: number[]; warningCount?: number }; reviewCount?: number; answerCount?: number };
type SavedAttempt = { answers?: Record<string, string>; submittedIds?: string[]; allSubmitted?: boolean };

function answerKey(answer: string) {
  return answer.replace(/[^A-Za-z0-9]/g, "").toUpperCase().split("").sort().join("");
}

function pairedAnswerValues(value: string): [string, string] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return [String(parsed[0] ?? ""), String(parsed[1] ?? "")];
  } catch { /* Existing attempts may contain the previous "first / second" format. */ }
  const [first = "", second = ""] = value.split(/\s+\/\s+/, 2);
  return [first, second];
}

function cleanGmatBank(bank: ExamSet): ExamSet {
  const questions = (bank.questions || []).filter((question) => !question.reviewRequired);
  return {
    ...bank,
    title: bank.category ? `${bank.category}题型训练` : (bank.title || "GMAT题型训练").replace(/\s*[·｜|]\s*官方指南/, "题型训练"),
    questions,
    questionCount: questions.length,
    answerCount: questions.filter((question) => Boolean(question.answer)).length,
    reviewCount: 0,
  };
}

function groupByPassage(questions: Question[]) {
  const groups: { passage: string; questions: Question[] }[] = [];
  for (const question of questions) {
    const passage = question.passage || "";
    const current = groups[groups.length - 1];
    if (!current || current.passage !== passage) groups.push({ passage, questions: [question] });
    else current.questions.push(question);
  }
  return groups;
}

function passageLineRows(passage: string) {
  return passage
    .replace(/^\s*Line\b\s*/i, "")
    .split(/\r?\n/)
    .map((rawLine, index) => {
      const line = rawLine.trimStart();
      const numbered = line.match(/^\((\d+)\)\s*(.*)$/);
      return { number: index === 0 ? "Line" : numbered?.[1] || "", text: numbered ? numbered[2] : line };
    })
    .filter((line) => line.text || line.number);
}

function QuestionCard({ question, storageId, value, submitted, onChange, onSubmit, displayNumber, hideSourceInfo = false, showPassage = true }: {
  question: Question; storageId: string; value: string; submitted: boolean;
  onChange: (id: string, value: string) => void; onSubmit?: (id: string) => void;
  displayNumber?: number; hideSourceInfo?: boolean; showPassage?: boolean;
}) {
  const questionNumber = displayNumber ?? question.number;
  const questionLabel = displayNumber ? `第 ${displayNumber} 题` : question.label || `第 ${questionNumber} 题`;
  const options = question.options || [];
  const isMulti = question.answerMode === "multi";
  const isPaired = question.answerMode === "paired";
  const selected = isMulti ? value.split("").filter(Boolean) : [value];
  const pairedValues = pairedAnswerValues(value);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const expected = question.answer || "";
  const expectedPairedValues = pairedAnswerValues(expected);
  const graded = Boolean(expected && value && (isPaired
    ? pairedValues.every(Boolean) && expectedPairedValues.every(Boolean)
    : /^[A-I]+$/i.test(expected)));
  const correct = graded && (isPaired
    ? pairedValues.every((answer, index) => answer.trim() === expectedPairedValues[index].trim())
    : answerKey(value) === answerKey(expected));
  const showAnswer = submitted;

  useEffect(() => {
    const input = answerInputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [value]);

  function choose(label: string) {
    if (!isMulti) return onChange(storageId, value === label ? "" : label);
    const next = new Set(selected);
    next.has(label) ? next.delete(label) : next.add(label);
    onChange(storageId, [...next].sort().join(""));
  }

  function updatePairedAnswer(index: 0 | 1, nextValue: string) {
    const next = [...pairedValues] as [string, string];
    next[index] = nextValue;
    onChange(storageId, JSON.stringify(next));
  }

  return <article className="senior-high-question-card exam-prep-question" id={`q-${storageId}`}>
    <div className="senior-high-question-meta">{questionLabel}{!displayNumber && question.group ? <small>{question.group}</small> : null}{question.difficulty ? <small>{question.difficulty}</small> : null}{!hideSourceInfo && question.reviewRequired ? <small className="exam-prep-review-badge" title={question.reviewNote || "这道题仍需对照原始资料复核。"}>来源待复核</small> : null}</div>
    {!hideSourceInfo && question.reviewRequired && question.reviewNote ? <p className={styles.reviewInline}>{question.reviewNote}{question.source?.page ? `（来源第 ${question.source.page} 页）` : ""}</p> : null}
    {showPassage && question.passage ? <div className="senior-high-passage-card"><div><strong>{question.passageTitle || "阅读材料"}</strong></div><p>{question.passage}</p></div> : null}
    <p className="senior-high-question-stem">{question.stem || question.prompt || "根据题目材料作答。"}</p>
    {question.table?.headers?.length ? <div aria-label={`第 ${questionNumber} 题数据表`} className={styles.tableWrap} role="region" tabIndex={0}>
      <table className={styles.dataTable}>
        <thead><tr>{question.table.headers.map((header, index) => <th key={`${index}-${header}`} scope="col">{header}</th>)}</tr></thead>
        <tbody>{question.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{question.table?.headers.map((_, columnIndex) => <td key={columnIndex}>{row[columnIndex] || ""}</td>)}</tr>)}</tbody>
      </table>
    </div> : null}
    {isPaired ? <div className={styles.pairedAnswers}>
      {[0, 1].map((index) => <label key={index}><span>{index === 0 ? "第一栏答案" : "第二栏答案"}</span>{options.length
        ? <select aria-label={`第 ${questionNumber} 题${index === 0 ? "第一" : "第二"}栏答案`} onChange={(event) => updatePairedAnswer(index as 0 | 1, event.target.value)} value={pairedValues[index]}>
          <option value="">请选择</option>{options.map((option) => <option key={option.label} value={option.text}>{option.label}. {option.text}</option>)}
        </select>
        : <input aria-label={`第 ${questionNumber} 题${index === 0 ? "第一" : "第二"}栏答案`} onChange={(event) => updatePairedAnswer(index as 0 | 1, event.target.value)} placeholder="在此填写答案" value={pairedValues[index]} />}</label>)}
    </div> : options.length ? <div aria-label={`第 ${questionNumber} 题选项`} className="senior-high-options">
      {options.map((option) => {
        const isSelected = selected.includes(option.label);
        const isCorrect = showAnswer && expected.includes(option.label);
        const className = [isSelected ? "selected" : "", isCorrect ? "correct-option" : "", showAnswer && isSelected && expected && !expected.includes(option.label) ? "incorrect-option" : ""].filter(Boolean).join(" ");
        return <button aria-pressed={isSelected} className={className} key={option.label} onClick={() => choose(option.label)} type="button"><b>{option.label}.</b><span>{option.text || (hideSourceInfo ? "选项文本暂缺" : "（原文选项文本待复核）")}</span>{showAnswer && isCorrect ? <b className="senior-high-option-status">✓</b> : null}</button>;
      })}
    </div> : <textarea aria-label={`${questionLabel}作答`} className={`senior-high-answer-input ${styles.answerTextarea}`} onChange={(event) => onChange(storageId, event.target.value)} placeholder="在此输入答案" ref={answerInputRef} rows={question.answerMode === "annual-group" ? 8 : question.answerMode === "essay" || question.answerMode === "translation" ? 7 : 3} value={value} />}
    {!showAnswer && onSubmit ? <div className="senior-high-submit-row"><button className="senior-high-submit" onClick={() => onSubmit(storageId)} type="button">提交本题并查看答案</button></div> : null}
    {showAnswer ? <div aria-live="polite" className={`senior-high-feedback ${graded ? correct ? "correct" : "incorrect" : "manual"}`}>
      <strong>{graded ? correct ? "作答正确" : "参考答案" : question.answerMode === "annual-group" ? "本年度参考答案资料" : "参考答案与解析"}{expected ? `：${expected}` : question.answerMode === "annual-group" ? "" : "：未提供逐题标准答案"}</strong>
      {question.explanation ? <div className="senior-high-analysis">{question.answerMode === "annual-group" ? <pre className="exam-prep-answer-pre">{question.explanation}</pre> : <p>{question.explanation}</p>}{!hideSourceInfo ? <small>来源：{question.source?.file || "本地资料"}{question.source?.page ? ` · 第 ${question.source.page} 页` : ""}{question.source?.section ? ` · 第 ${question.source.section} 组` : ""}{question.source?.answerFile ? ` · 答案解析：${question.source.answerFile}` : ""}{question.source?.corroboratingFile ? ` · 选项核对：${question.source.corroboratingFile}${question.source.corroboratingPage ? ` 第 ${question.source.corroboratingPage} 页` : ""}` : ""}</small> : null}</div> : <div className="senior-high-analysis"><p>{hideSourceInfo ? "暂未提供逐题解析。" : <>来源资料未提供可配对的逐题解析。{expected ? "可先对照参考答案。" : "本题暂不参与自动判分。"}</>}</p>{!hideSourceInfo ? <small>来源：{question.source?.file || "本地资料"}{question.source?.answerFile ? ` · 答案解析：${question.source.answerFile}` : ""}</small> : null}</div>}
    </div> : null}
  </article>;
}

function PaperSection({ section, sectionIndex, answers, submitted, onAnswer }: {
  section: Section; sectionIndex: number; answers: Record<string, string>; submitted: boolean;
  onAnswer: (id: string, value: string) => void;
}) {
  const questions = section.questions || [];
  return <section className="exam-prep-section"><header><h2>{section.title}</h2></header>
    {section.directions ? <p className="senior-high-muted">{section.directions}</p> : null}
    {section.passage ? <div className="senior-high-passage-card"><p>{section.passage}</p></div> : null}
    {section.source ? <div className="senior-high-passage-card"><p>{section.source}</p></div> : null}
    {section.passages?.map((passage, passageIndex) => <div className="exam-prep-passage-group" key={`${sectionIndex}-${passageIndex}`}>
      {passage.title ? <h3>{passage.title}</h3> : null}{passage.text ? <div className="senior-high-passage-card"><p>{passage.text}</p></div> : null}
      <div className="exam-prep-question-list">{passage.questions.map((question, questionIndex) => {
        const id = `s${sectionIndex}-p${passageIndex}-q${questionIndex}`;
        return <QuestionCard key={id} onChange={onAnswer} question={question} storageId={id} submitted={submitted} value={answers[id] || ""} />;
      })}</div>
    </div>)}
    {questions.length ? <div className="exam-prep-question-list">{questions.map((question, questionIndex) => {
      const id = `s${sectionIndex}-q${questionIndex}`;
      return <QuestionCard key={id} onChange={onAnswer} question={question} storageId={id} submitted={submitted} value={answers[id] || ""} />;
    })}</div> : null}
  </section>;
}

export function ExamPrepRunner({ exam, setId, dataPath }: { exam: ExamId; setId: string; dataPath: string }) {
  const [baseData, setBaseData] = useState<ExamSet | null>(null);
  const [questionOverrides, setQuestionOverrides] = useState<ExamPrepQuestionOverrideState>({ overrides: {}, additions: [] });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const [activeGroup, setActiveGroup] = useState("");
  const [questionPage, setQuestionPage] = useState(0);
  const [error, setError] = useState("");
  const storageKey = `exam-prep:v1:${exam}:${setId}`;

  useEffect(() => {
    let cancelled = false;
    setBaseData(null);
    setQuestionOverrides({ overrides: {}, additions: [] });
    setError("");
    async function loadSet() {
      try {
        const response = await fetch(`/exam-prep/${exam}/${dataPath}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rawStaticData = await response.json() as ExamSet;
        const staticData = exam === "gmat" ? cleanGmatBank(rawStaticData) : rawStaticData;
        if (cancelled) return;
        setBaseData(staticData);
        if (exam === "gmat") {
          try {
            const { data: saved, error: savedError } = await supabase
              .from("exam_prep_banks")
              .select("bank_data")
              .eq("exam", "gmat")
              .eq("bank_id", setId)
              .eq("status", "published")
              .maybeSingle();
            if (!cancelled && !savedError && saved?.bank_data) setBaseData(cleanGmatBank(saved.bank_data as ExamSet));
          } catch { /* Keep the static GMAT bank available when its optional override table is unavailable. */ }
        } else if (exam === "gre") {
          try {
            const overrides = await loadExamPrepQuestionOverrides(exam, setId);
            if (!cancelled) setQuestionOverrides(overrides);
          } catch { /* Keep the static GRE bank available when the override store is unreachable. */ }
        }
      } catch {
        if (!cancelled) setError("这组题目暂时无法载入，请返回目录选择其他练习。");
      }
    }
    void loadSet();
    return () => { cancelled = true; };
  }, [dataPath, exam, setId]);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as SavedAttempt | null;
      if (saved) {
        setAnswers(saved.answers || {});
        setSubmittedIds(new Set(saved.submittedIds || []));
        setAllSubmitted(Boolean(saved.allSubmitted));
      }
    } catch { /* Ignore a damaged local attempt. */ }
    setLoadedStorageKey(storageKey);
  }, [storageKey]);
  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ answers, submittedIds: [...submittedIds], allSubmitted } satisfies SavedAttempt));
  }, [answers, allSubmitted, loadedStorageKey, storageKey, submittedIds]);

  const data = useMemo(() => {
    if (!baseData) return null;
    return exam === "gre" ? applyExamPrepQuestionOverrides(baseData, questionOverrides) : baseData;
  }, [baseData, exam, questionOverrides]);

  const questionRefs = useMemo(() => {
    const refs: { id: string; question: Question }[] = [];
    for (const [sectionIndex, section] of (data?.sections || []).entries()) {
      for (const [passageIndex, passage] of (section.passages || []).entries()) {
        for (const [questionIndex, question] of passage.questions.entries()) refs.push({ id: `s${sectionIndex}-p${passageIndex}-q${questionIndex}`, question });
      }
      for (const [questionIndex, question] of (section.questions || []).entries()) refs.push({ id: `s${sectionIndex}-q${questionIndex}`, question });
    }
    for (const question of data?.questions || []) {
      if (exam === "gmat" && question.reviewRequired) continue;
      refs.push({ id: question.id || `q-${question.number}`, question });
    }
    return refs;
  }, [data, exam]);
  const answeredCount = questionRefs.filter((ref) => Boolean(answers[ref.id]?.trim())).length;
  const practiceQuestions = (data?.questions || []).filter((question) => exam !== "gmat" || !question.reviewRequired);
  const groupNames = [...new Set(practiceQuestions.map((question) => question.group || data?.category || "题目"))];
  const currentGroup = groupNames.includes(activeGroup) ? activeGroup : groupNames[0] || "";
  const groupedQuestions = practiceQuestions.filter((question) => (question.group || data?.category || "题目") === currentGroup);
  const pageSize = exam === "gmat" ? 50 : 20;
  const pageCount = Math.max(1, Math.ceil(groupedQuestions.length / pageSize));
  const showPageNavigation = exam === "gmat" || groupedQuestions.length > pageSize;
  const pageStart = questionPage * pageSize + 1;
  const pageEnd = Math.min((questionPage + 1) * pageSize, groupedQuestions.length);
  const visibleQuestions = groupedQuestions.slice(questionPage * pageSize, (questionPage + 1) * pageSize);
  const isGmatReading = exam === "gmat" && setId === "gmat-reading";
  const readingGroups = isGmatReading ? groupByPassage(visibleQuestions) : [];
  const displayNumber = (question: Question) => exam === "gmat"
    ? practiceQuestions.findIndex((item) => item.id === question.id) + 1
    : undefined;

  function saveAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setAllSubmitted(false);
    if (submittedIds.has(id)) setSubmittedIds((current) => { const next = new Set(current); next.delete(id); return next; });
  }
  function submitQuestion(id: string) {
    setSubmittedIds((current) => new Set(current).add(id));
  }
  function submitAll() {
    setAllSubmitted(true);
    setSubmittedIds(new Set(questionRefs.map((ref) => ref.id)));
  }
  function questionNavigation(position: "top" | "bottom") {
    return <nav aria-label={`题号导航（${position === "top" ? "顶部" : "底部"}）`} className={`senior-high-v2-question-nav direct ${position} exam-prep-gmat-question-nav`}>
      {visibleQuestions.map((question) => {
        const storageId = question.id || `q-${question.number}`;
        return <button className={answers[storageId]?.trim() ? "answered" : "unanswered"} key={storageId} onClick={() => document.getElementById(`q-${storageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button">{displayNumber(question)}</button>;
      })}
    </nav>;
  }

  if (error) return <section className="senior-high-page"><div className="senior-high-alert">{error}</div></section>;
  if (!data) return <section className="senior-high-page"><div className="senior-high-loading">正在载入题目与答案结构…</div></section>;
  const isPaper = data.kind === "paper" || data.mode === "paper";

  return <section className={`senior-high-page senior-high-v2-runner exam-prep-runner${exam === "gmat" ? " is-gmat" : ""}`} data-paper-font-size={exam === "gmat" ? "large" : undefined}>
    <header className="senior-high-v2-runner-header">{exam === "gmat" ? <VocabularyMobileBackLink ariaLabel="返回题库" className="senior-high-back" desktopLabel="‹" href={`/${exam}?entry=${isPaper ? "papers" : "practice"}`} /> : <Link className="senior-high-back" href={`/${exam}?entry=${isPaper ? "papers" : "practice"}`}>← 返回题库</Link>}<div className="senior-high-v2-runner-title"><h1>{data.title}</h1></div><div aria-label={`${answeredCount}/${data.questionCount}`} className="senior-high-v2-progress"><strong>{answeredCount}/{data.questionCount}</strong>{exam === "gmat" ? null : <span>已作答</span>}</div></header>
    {exam !== "gmat" && data.reviewCount ? <div className="exam-prep-review-note">本组有 {data.reviewCount}{data.unitLabel ? ` 个${data.unitLabel}` : " 题"}标记为来源复核项；题目仍可练习，查看答案时请留意原文缺失或 OCR 质量。</div> : null}
    {data.sections?.map((section, sectionIndex) => <PaperSection key={`${section.title}-${sectionIndex}`} onAnswer={saveAnswer} section={section} sectionIndex={sectionIndex} submitted={allSubmitted} answers={answers} />)}
    {exam === "gre" && baseData?.questions ? <ExamPrepQuestionAdmin exam={exam} setId={setId} questions={baseData.questions} overrideState={questionOverrides} onChange={(next) => { setQuestionOverrides(next); setQuestionPage(0); }} /> : null}
    {data.questions?.length ? <>
      {groupNames.length > 1 ? <div className="senior-high-v2-filters"><label>题组<select onChange={(event) => { setActiveGroup(event.target.value); setQuestionPage(0); }} value={currentGroup}>{groupNames.map((group) => <option key={group}>{group}</option>)}</select></label></div> : null}
      {showPageNavigation ? <nav aria-label="题目页码" className="exam-prep-pagination"><button disabled={questionPage === 0} onClick={() => setQuestionPage((page) => Math.max(0, page - 1))} type="button">上一页</button><span>第 {pageStart}–{pageEnd} 题 · 共 {groupedQuestions.length} 题</span><button disabled={questionPage + 1 >= pageCount} onClick={() => setQuestionPage((page) => Math.min(pageCount - 1, page + 1))} type="button">下一页</button></nav> : null}
      {exam === "gmat" ? questionNavigation("top") : null}
      {isGmatReading ? <div className="exam-prep-reading-groups">{readingGroups.map((group, groupIndex) => <section className="senior-high-v2-group with-stimulus-questions exam-prep-reading-row" data-has-options={group.questions.some((question) => Boolean(question.options?.length)) ? "true" : "false"} data-presentation="reading" data-side-questions="true" key={`${groupIndex}-${group.questions[0]?.id || "passage"}`}>
        <h3>{group.questions[0]?.passageTitle || "阅读文章"}</h3>
        <div className="senior-high-v2-group-body">
          <div aria-label="阅读文章原文" className="senior-high-v2-stimulus exam-prep-reading-passage"><div className="exam-prep-reading-lines">{passageLineRows(group.passage).map((line, lineIndex) => <div className="exam-prep-reading-line" key={`${lineIndex}-${line.number}`}><span className="exam-prep-reading-line-number">{line.number}</span><span className="exam-prep-reading-line-text">{line.text}</span></div>)}</div></div>
          <div className="senior-high-v2-question-column">{group.questions.map((question) => <QuestionCard displayNumber={displayNumber(question)} hideSourceInfo key={question.id} onChange={saveAnswer} onSubmit={submitQuestion} question={question} showPassage={false} storageId={question.id || `q-${question.number}`} submitted={allSubmitted || submittedIds.has(question.id || `q-${question.number}`)} value={answers[question.id || `q-${question.number}`] || ""} />)}</div>
        </div>
      </section>)}</div> : visibleQuestions.map((question) => <QuestionCard displayNumber={displayNumber(question)} hideSourceInfo={exam === "gmat"} key={question.id} onChange={saveAnswer} onSubmit={submitQuestion} question={question} storageId={question.id || `q-${question.number}`} submitted={allSubmitted || submittedIds.has(question.id || `q-${question.number}`)} value={answers[question.id || `q-${question.number}`] || ""} />)}
      {exam === "gmat" ? questionNavigation("bottom") : null}
      {showPageNavigation ? <nav aria-label="题目页码" className="exam-prep-pagination"><button disabled={questionPage === 0} onClick={() => setQuestionPage((page) => Math.max(0, page - 1))} type="button">上一页</button><span>第 {pageStart}–{pageEnd} 题 · 共 {groupedQuestions.length} 题</span><button disabled={questionPage + 1 >= pageCount} onClick={() => setQuestionPage((page) => Math.min(pageCount - 1, page + 1))} type="button">下一页</button></nav> : null}
    </> : null}
    {isPaper ? <div className="exam-prep-paper-submit"><span>{answeredCount}/{data.questionCount} 题已作答</span><button className="senior-high-submit" onClick={submitAll} type="button">{allSubmitted ? "重新查看答案与解析" : "提交整卷并查看答案与解析"}</button></div> : <div className="senior-high-submit-row"><button className="senior-high-submit" onClick={submitAll} type="button">{allSubmitted ? "重新展开全部答案" : "提交全部并展开答案"}</button></div>}
    {allSubmitted && (data.answerKeyText || data.explanationText) ? <section className="exam-prep-answer-source"><h2>整卷参考答案与解析</h2>{data.answerKeyText ? <><h3>答案</h3><pre>{data.answerKeyText}</pre></> : null}{data.explanationText ? <><h3>解析</h3><pre>{data.explanationText}</pre></> : null}</section> : null}
  </section>;
}
