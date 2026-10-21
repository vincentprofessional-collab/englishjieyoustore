"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ExamId = "postgraduate" | "gre" | "gmat";
type Option = { label: string; text: string };
type Question = {
  id?: string; number: number; label?: string; stem?: string; prompt?: string; options?: Option[]; answer?: string | null;
  answerMode?: string; explanation?: string; reviewRequired?: boolean; source?: { file?: string; answerFile?: string; page?: number; section?: number; passage?: number };
  group?: string; difficulty?: string; passage?: string; passageTitle?: string;
};
type Passage = { title?: string; text?: string; questions: Question[] };
type Section = { title: string; kind?: string; directions?: string; source?: string; passage?: string; questions: Question[]; passages?: Passage[] };
type ExamSet = { id: string; exam: ExamId; title: string; category?: string; kind?: string; mode?: string; unitLabel?: string; questionCount: number; sections?: Section[]; questions?: Question[]; answerKeyText?: string; explanationText?: string; quality?: { reviewQuestionNumbers?: number[]; warningCount?: number }; reviewCount?: number; answerCount?: number };
type SavedAttempt = { answers?: Record<string, string>; submittedIds?: string[]; allSubmitted?: boolean };

function answerKey(answer: string) {
  return answer.replace(/[^A-Za-z0-9]/g, "").toUpperCase().split("").sort().join("");
}

function QuestionCard({ question, storageId, value, submitted, onChange, onSubmit }: {
  question: Question; storageId: string; value: string; submitted: boolean;
  onChange: (id: string, value: string) => void; onSubmit?: (id: string) => void;
}) {
  const options = question.options || [];
  const isMulti = question.answerMode === "multi";
  const selected = isMulti ? value.split("").filter(Boolean) : [value];
  const expected = question.answer || "";
  const graded = Boolean(expected && value && /^[A-I]+$/i.test(expected));
  const correct = graded && answerKey(value) === answerKey(expected);
  const showAnswer = submitted;

  function choose(label: string) {
    if (!isMulti) return onChange(storageId, value === label ? "" : label);
    const next = new Set(selected);
    next.has(label) ? next.delete(label) : next.add(label);
    onChange(storageId, [...next].sort().join(""));
  }

  return <article className="senior-high-question-card exam-prep-question" id={`q-${storageId}`}>
    <div className="senior-high-question-meta">{question.label || `第 ${question.number} 题`}{question.group ? <small>{question.group}</small> : null}{question.difficulty ? <small>{question.difficulty}</small> : null}{question.reviewRequired ? <small className="exam-prep-review-badge">来源待复核</small> : null}</div>
    {question.passage ? <div className="senior-high-passage-card"><div><strong>{question.passageTitle || "阅读材料"}</strong></div><p>{question.passage}</p></div> : null}
    <p className="senior-high-question-stem">{question.stem || question.prompt || "根据题目材料作答。"}</p>
    {options.length ? <div aria-label={`第 ${question.number} 题选项`} className="senior-high-options">
      {options.map((option) => {
        const isSelected = selected.includes(option.label);
        const isCorrect = showAnswer && expected.includes(option.label);
        const className = [isSelected ? "selected" : "", isCorrect ? "correct-option" : "", showAnswer && isSelected && expected && !expected.includes(option.label) ? "incorrect-option" : ""].filter(Boolean).join(" ");
        return <button aria-pressed={isSelected} className={className} key={option.label} onClick={() => choose(option.label)} type="button"><b>{option.label}.</b><span>{option.text || "（原文选项文本待复核）"}</span>{showAnswer && isCorrect ? <b className="senior-high-option-status">✓</b> : null}</button>;
      })}
    </div> : <textarea aria-label={`${question.label || `第 ${question.number} 题`}作答`} className="senior-high-answer-input" onChange={(event) => onChange(storageId, event.target.value)} placeholder="在此输入答案" rows={question.answerMode === "annual-group" ? 8 : question.answerMode === "essay" || question.answerMode === "translation" ? 7 : 3} value={value} />}
    {!showAnswer && onSubmit ? <div className="senior-high-submit-row"><button className="senior-high-submit" onClick={() => onSubmit(storageId)} type="button">提交本题并查看答案</button></div> : null}
    {showAnswer ? <div aria-live="polite" className={`senior-high-feedback ${graded ? correct ? "correct" : "incorrect" : "manual"}`}>
      <strong>{graded ? correct ? "作答正确" : "参考答案" : question.answerMode === "annual-group" ? "本年度参考答案资料" : "参考答案与解析"}{expected ? `：${expected}` : question.answerMode === "annual-group" ? "" : "：未提供逐题标准答案"}</strong>
      {question.explanation ? <div className="senior-high-analysis">{question.answerMode === "annual-group" ? <pre className="exam-prep-answer-pre">{question.explanation}</pre> : <p>{question.explanation}</p>}<small>来源：{question.source?.file || "本地资料"}{question.source?.page ? ` · 第 ${question.source.page} 页` : ""}{question.source?.section ? ` · 第 ${question.source.section} 组` : ""}{question.source?.answerFile ? ` · 答案解析：${question.source.answerFile}` : ""}</small></div> : <div className="senior-high-analysis"><p>来源资料未提供可配对的逐题解析。{expected ? "可先对照参考答案。" : "本题暂不参与自动判分。"}</p><small>来源：{question.source?.file || "本地资料"}{question.source?.answerFile ? ` · 答案解析：${question.source.answerFile}` : ""}</small></div>}
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
  const [data, setData] = useState<ExamSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const [activeGroup, setActiveGroup] = useState("");
  const [questionPage, setQuestionPage] = useState(0);
  const [error, setError] = useState("");
  const storageKey = `exam-prep:v1:${exam}:${setId}`;

  useEffect(() => {
    fetch(`/exam-prep/${exam}/${dataPath}`).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<ExamSet>;
    }).then(setData).catch(() => setError("这组题目暂时无法载入，请返回目录选择其他练习。"));
  }, [exam, setId]);
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

  const questionRefs = useMemo(() => {
    const refs: { id: string; question: Question }[] = [];
    for (const [sectionIndex, section] of (data?.sections || []).entries()) {
      for (const [passageIndex, passage] of (section.passages || []).entries()) {
        for (const [questionIndex, question] of passage.questions.entries()) refs.push({ id: `s${sectionIndex}-p${passageIndex}-q${questionIndex}`, question });
      }
      for (const [questionIndex, question] of (section.questions || []).entries()) refs.push({ id: `s${sectionIndex}-q${questionIndex}`, question });
    }
    for (const question of data?.questions || []) refs.push({ id: question.id || `q-${question.number}`, question });
    return refs;
  }, [data]);
  const answeredCount = questionRefs.filter((ref) => Boolean(answers[ref.id]?.trim())).length;
  const groupNames = [...new Set((data?.questions || []).map((question) => question.group || data?.category || "题目"))];
  const currentGroup = groupNames.includes(activeGroup) ? activeGroup : groupNames[0] || "";
  const groupedQuestions = (data?.questions || []).filter((question) => (question.group || data?.category || "题目") === currentGroup);
  const pageCount = Math.max(1, Math.ceil(groupedQuestions.length / 20));
  const visibleQuestions = groupedQuestions.slice(questionPage * 20, (questionPage + 1) * 20);

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

  if (error) return <section className="senior-high-page"><div className="senior-high-alert">{error}</div></section>;
  if (!data) return <section className="senior-high-page"><div className="senior-high-loading">正在载入题目与答案结构…</div></section>;
  const isPaper = data.kind === "paper" || data.mode === "paper";

  return <section className="senior-high-page senior-high-v2-runner exam-prep-runner">
    <header className="senior-high-v2-runner-header"><Link className="senior-high-back" href={`/${exam}?entry=${isPaper ? "papers" : "practice"}`}>← 返回题库</Link><div className="senior-high-v2-runner-title"><h1>{data.title}</h1><p>{isPaper ? "完成作答后提交整卷，查看对应参考答案和 OCR 解析。" : "答案来自题库配套资料；提交单题后可查看答案和解析。"}</p></div><div className="senior-high-v2-progress">已作答 <strong>{answeredCount}</strong> / {data.questionCount}</div></header>
    {data.reviewCount ? <div className="exam-prep-review-note">本组有 {data.reviewCount}{data.unitLabel ? ` 个${data.unitLabel}` : " 题"}标记为来源复核项；题目仍可练习，查看答案时请留意原文缺失或 OCR 质量。</div> : null}
    {data.sections?.map((section, sectionIndex) => <PaperSection key={`${section.title}-${sectionIndex}`} onAnswer={saveAnswer} section={section} sectionIndex={sectionIndex} submitted={allSubmitted} answers={answers} />)}
    {data.questions?.length ? <>
      {groupNames.length > 1 ? <div className="senior-high-v2-filters"><label>题组<select onChange={(event) => { setActiveGroup(event.target.value); setQuestionPage(0); }} value={currentGroup}>{groupNames.map((group) => <option key={group}>{group}</option>)}</select></label></div> : null}
      {groupedQuestions.length > 20 ? <nav aria-label="题目页码" className="exam-prep-pagination"><button disabled={questionPage === 0} onClick={() => setQuestionPage((page) => Math.max(0, page - 1))} type="button">上一页</button><span>第 {questionPage + 1} / {pageCount} 页 · {groupedQuestions.length} 题</span><button disabled={questionPage + 1 >= pageCount} onClick={() => setQuestionPage((page) => Math.min(pageCount - 1, page + 1))} type="button">下一页</button></nav> : null}
      {visibleQuestions.map((question) => <QuestionCard key={question.id} onChange={saveAnswer} onSubmit={submitQuestion} question={question} storageId={question.id || `q-${question.number}`} submitted={allSubmitted || submittedIds.has(question.id || `q-${question.number}`)} value={answers[question.id || `q-${question.number}`] || ""} />)}
      {groupedQuestions.length > 20 ? <nav aria-label="题目页码" className="exam-prep-pagination"><button disabled={questionPage === 0} onClick={() => setQuestionPage((page) => Math.max(0, page - 1))} type="button">上一页</button><span>第 {questionPage + 1} / {pageCount} 页</span><button disabled={questionPage + 1 >= pageCount} onClick={() => setQuestionPage((page) => Math.min(pageCount - 1, page + 1))} type="button">下一页</button></nav> : null}
    </> : null}
    {isPaper ? <div className="exam-prep-paper-submit"><span>{answeredCount}/{data.questionCount} 题已作答</span><button className="senior-high-submit" onClick={submitAll} type="button">{allSubmitted ? "重新查看答案与解析" : "提交整卷并查看答案与解析"}</button></div> : <div className="senior-high-submit-row"><button className="senior-high-submit" onClick={submitAll} type="button">{allSubmitted ? "重新展开全部答案" : "提交全部并展开答案"}</button></div>}
    {allSubmitted && (data.answerKeyText || data.explanationText) ? <section className="exam-prep-answer-source"><h2>整卷答案与解析原文</h2>{data.answerKeyText ? <><h3>答案</h3><pre>{data.answerKeyText}</pre></> : null}{data.explanationText ? <><h3>解析</h3><pre>{data.explanationText}</pre></> : null}</section> : null}
  </section>;
}
