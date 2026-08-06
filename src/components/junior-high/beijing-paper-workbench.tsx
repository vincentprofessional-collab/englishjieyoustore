"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";
import paper from "@/lib/junior-high/beijing-2024-simulation.json";

type PaperQuestion = (typeof paper.questions)[number];
type BookCard = (typeof paper.readingA.books)[number];

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function PaperTimer({ running, seconds, onToggle }: { running: boolean; seconds: number; onToggle: () => void }) {
  const negative = seconds < 0;
  const absolute = Math.abs(seconds);
  const text = `${negative ? "-" : ""}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  return <button aria-label="中考英语模拟卷计时器" className={`junior-high-timer ${negative ? "is-over" : ""}`} onClick={onToggle} type="button">{text} · {running ? "暂停" : "开始"}</button>;
}

function QuestionNavigation({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  return <nav aria-label="试卷题号导航" className="junior-high-paper-nav">{paper.questions.map((question, index) => <button className={current === index ? "selected" : ""} key={question.id} onClick={() => onSelect(index)} type="button">{question.number}</button>)}</nav>;
}

function questionSection(question: PaperQuestion) {
  if (question.number <= 12) return "单项填空";
  if (question.number <= 20) return "完形填空";
  if (question.number <= 33) return "阅读理解";
  return "阅读表达";
}

function renderContext(text: string): ReactNode {
  return text.split(/(?<!\d)(13|14|15|16|17|18|19|20)(?!\d)/g).map((part, index) => {
    if (/^(13|14|15|16|17|18|19|20)$/.test(part)) {
      return <span className="junior-high-inline-blank" key={`${part}-${index}`}>{part}</span>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function PaperQuestionCard({ question, value, submitted, onAnswer, cloze }: { question: PaperQuestion; value: string; submitted: boolean; onAnswer: (value: string) => void; cloze?: boolean }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isOpenResponse = question.options.length === 0;
  const isCorrect = !isOpenResponse && value === question.answer;
  return (
    <article className={`junior-high-question-card ${cloze ? "junior-high-cloze-question" : ""}`} data-question-number={question.number} id={`junior-high-question-${question.number}`}>
      <div className="junior-high-question-heading"><strong>第 {question.number} 题</strong>{cloze ? null : <span>{questionSection(question)}</span>}</div>
      <p className="junior-high-question-prompt">{question.prompt}</p>
      {isOpenResponse ? <textarea value={value} onChange={(event) => onAnswer(event.target.value)} placeholder="请输入答案……" rows={question.number === 37 ? 4 : 2} /> : <div className="junior-high-options">{question.options.map((option) => <button className={value === option[0] ? "selected" : ""} key={option} onClick={() => onAnswer(option[0])} type="button">{option}</button>)}</div>}
      {submitted ? <div className="junior-high-feedback"><span>你的答案：{value || "未作答"}</span><span>{isOpenResponse ? "参考答案" : "正确答案"}：{question.answer}</span><span className={isOpenResponse ? "manual" : isCorrect ? "correct" : "incorrect"}>{isOpenResponse ? "人工复核" : isCorrect ? "✓ 正确" : "✕ 请查看解析"}</span><button onClick={() => setShowAnalysis(!showAnalysis)} type="button">解析</button>{showAnalysis ? <div className="junior-high-analysis"><strong>解析</strong><button onClick={() => setShowAnalysis(false)} type="button">关闭</button><p>{question.analysis}</p></div> : null}</div> : null}
    </article>
  );
}

function BookTable() {
  return <div className="junior-high-book-table" aria-label="阅读理解 A 书籍介绍">{paper.readingA.books.map((book: BookCard) => <article className="junior-high-book-card" key={book.letter}><div className="junior-high-book-letter">{book.letter}</div><img alt={`${book.title} 封面`} src={book.image} /><div className="junior-high-book-copy"><h3>{book.title}</h3><p className="junior-high-book-meta">{book.author}<br />{book.site}</p><p className="junior-high-book-meta">{book.format}<br />{book.price}</p><p>{book.description}</p></div></article>)}</div>;
}

function PassageGroup({ title, context, questions, answers, submitted, onAnswer, variant = "text", image }: { title: string; context: string; questions: PaperQuestion[]; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; variant?: "text" | "cloze" | "readingA" | "readingResponse"; image?: string }) {
  return <section className="junior-high-passage-layout"><div className="junior-high-passage-column"><h3>{title}</h3>{variant === "readingA" ? <BookTable /> : <><>{image ? <img alt={`${title} 原文配图`} className="junior-high-context-image" src={image} /> : null}</><div className="junior-high-passage-text">{variant === "cloze" ? renderContext(context) : context}</div></>}{variant === "cloze" ? <p className="junior-high-passage-note">文中题号后的虚线为填空位置，请结合上下文选择答案。</p> : null}</div><div className="junior-high-passage-questions">{questions.map((question) => <PaperQuestionCard cloze={variant === "cloze"} key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>;
}

function WritingTask({ label, prompt, requirements, opening, closing, value, onChange, children }: { label: string; prompt: string; requirements: string; opening?: string; closing?: string; value: string; onChange: (value: string) => void; children?: ReactNode }) {
  const wordCount = countWords(value);
  return <section className="junior-high-writing-task"><h3>{label}</h3><p className="junior-high-writing-prompt">{prompt}</p>{children}<p className="junior-high-writing-requirements">{requirements}</p>{opening ? <p className="junior-high-writing-opening">{opening}</p> : null}<textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="请在此处完成作文……" rows={9} /><div className="junior-high-writing-word-count">字数：{wordCount}</div>{closing ? <p className="junior-high-writing-closing">{closing}</p> : null}</section>;
}

export function BeijingPaperWorkbench({ onBack }: { onBack: () => void }) {
  const [running, setRunning] = useState(true);
  const [seconds, setSeconds] = useState(paper.durationMinutes * 60);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writingA, setWritingA] = useState("");
  const [writingB, setWritingB] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    document.documentElement.classList.toggle("ielts-fullscreen-active", isFullscreen);
    return () => document.documentElement.classList.remove("ielts-fullscreen-active");
  }, [isFullscreen]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setIsFullscreen(false);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function selectQuestion(index: number) {
    setCurrent(index);
    document.getElementById(`junior-high-question-${paper.questions[index].number}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function toggleFullscreen() {
    if (isFullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setIsFullscreen(false);
      return;
    }
    setIsFullscreen(true);
    if (!document.fullscreenElement && pageRef.current?.requestFullscreen) await pageRef.current.requestFullscreen().catch(() => undefined);
  }

  const byRange = (from: number, to: number) => paper.questions.filter((question) => question.number >= from && question.number <= to);
  const handleAnswer = (question: PaperQuestion, value: string) => setAnswers((previous) => ({ ...previous, [question.id]: value }));

  return <section className={`stack junior-high-page junior-high-exam-page ${isFullscreen ? "fullscreen" : ""}`} data-local-selection-actions="true" ref={pageRef}>
    <div className="junior-high-exam-toolbar"><button className="junior-high-back" onClick={onBack} type="button">← 返回选择</button><div className="junior-high-exam-toolbar-title"><strong>中考英语 北京2024年模拟卷</strong></div><PaperTimer onToggle={() => setRunning(!running)} running={running} seconds={seconds} /><div className="junior-high-toolbar-actions"><button className={`annotation-toggle ielts-exam-action ielts-fullscreen-toggle ${isFullscreen ? "active" : ""}`} onClick={() => void toggleFullscreen()} type="button">{isFullscreen ? "退出全屏" : "全屏"}</button><StudyAnnotationTools buttonClassName="annotation-toggle ielts-exam-action" sourceHref="/junior-high" sourceId="junior-high:2024-beijing-simulation" sourceTitle={paper.fileName} surfaceRef={pageRef} /></div></div>
    <QuestionNavigation current={current} onSelect={selectQuestion} />
    <div className="junior-high-paper-content">
      <section className="junior-high-paper-section"><h2>第一部分</h2><p className="junior-high-paper-intro">本部分共33题，共40分。在每题列出的四个选项中，选出最符合题目要求的一项。</p><h3 className="junior-high-section-subtitle">一、单项填空（每题0. 5分，共6分）</h3><p className="junior-high-paper-intro">从下面各题所给的A、B、C、D四个选项中，选择可以填入空白处的最佳选项。</p><div className="junior-high-question-stack">{byRange(1, 12).map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => handleAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>
      <section className="junior-high-paper-section"><h2>二、完形填空（每题1分，共8分）</h2><p className="junior-high-paper-intro">阅读下面的短文，掌握其大意，然后从短文后各题所给的A、B、C、D四个选项中，选择最佳选项。</p><PassageGroup context={paper.questions[12].context} image="/junior-high/beijing-2024/bean-taco.png" questions={byRange(13, 20)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="完形填空原文" variant="cloze" /></section>
      <section className="junior-high-paper-section"><h2>三、阅读理解（每题2分，共26分）</h2><p className="junior-high-paper-intro">阅读下列短文或课程介绍，根据题目要求选择最佳选项。</p><p className="junior-high-paper-intro junior-high-paper-intro-muted">{paper.readingA.instructions}</p><PassageGroup context={paper.questions[20].context} questions={byRange(21, 23)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · A" variant="readingA" /><PassageGroup context={paper.questions[23].context} questions={byRange(24, 26)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · B" /><PassageGroup context={paper.questions[26].context} questions={byRange(27, 29)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · C" /><PassageGroup context={paper.questions[29].context} questions={byRange(30, 33)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · D" /></section>
      <section className="junior-high-paper-section junior-high-reading-response-section"><h2>第二部分</h2><p className="junior-high-paper-intro">本部分共5题，共20分。根据题目要求，完成相应任务。</p><h3 className="junior-high-section-subtitle">四、阅读表达（第34—36题每题2分，第37题4分，共10分）</h3><p className="junior-high-paper-intro">阅读短文，根据短文内容回答问题。</p><PassageGroup context={paper.questions[33].context} image="/junior-high/beijing-2024/exoskeleton.png" questions={byRange(34, 37)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读表达原文" variant="readingResponse" /></section>
      <section className="junior-high-paper-section"><h2>五、文段表达（10分）</h2><div className="junior-high-paper-writing"><WritingTask label="A." opening={paper.writing.openingA} prompt={paper.writing.promptA} requirements={paper.writing.requirementsA} value={writingA} onChange={setWritingA}><table className="junior-high-writing-table"><tbody>{paper.writing.tableA.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table></WritingTask><WritingTask label="B." closing={paper.writing.closingB} opening={paper.writing.openingB} prompt={paper.writing.promptB} requirements={`${paper.writing.contentPointsB}\n${paper.writing.requirementsB}`} value={writingB} onChange={setWritingB}><img alt="快乐阅读日活动图示" className="junior-high-writing-diagram" src={paper.writing.diagram} /></WritingTask>{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span></div> : null}</div></section>
    </div>
    <QuestionNavigation current={current} onSelect={selectQuestion} />
    <footer><span>{submitted ? `已提交 ${paper.questions.length} 道题` : `共 ${paper.questions.length} 道题 · 文段表达 2 题`}</span><button className="junior-high-submit" onClick={() => { setSubmitted(true); setRunning(false); }} type="button">提交答卷</button></footer>
  </section>;
}
