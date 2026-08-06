"use client";

import { useEffect, useRef, useState } from "react";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";
import paper from "@/lib/junior-high/beijing-2024-simulation.json";

type PaperQuestion = (typeof paper.questions)[number];

function PaperTimer({ running, seconds, onToggle }: { running: boolean; seconds: number; onToggle: () => void }) {
  const negative = seconds < 0;
  const absolute = Math.abs(seconds);
  const text = `${negative ? "-" : ""}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  return <button aria-label="中考英语模考计时器" className={`junior-high-timer ${negative ? "is-over" : ""}`} onClick={onToggle} type="button">{text} · {running ? "暂停" : "开始"}</button>;
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

function PaperQuestionCard({ question, value, submitted, onAnswer, cloze }: { question: PaperQuestion; value: string; submitted: boolean; onAnswer: (value: string) => void; cloze?: boolean }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isOpenResponse = question.options.length === 0;
  const isCorrect = !isOpenResponse && value === question.answer;
  return (
    <article className={`junior-high-question-card ${cloze ? "junior-high-cloze-question" : ""}`} data-question-number={question.number} id={`junior-high-question-${question.number}`}>
      <div className="junior-high-question-heading"><span>{questionSection(question)}</span><strong>第 {question.number} 题</strong></div>
      <p className="junior-high-question-prompt">{question.prompt}</p>
      {isOpenResponse ? <textarea value={value} onChange={(event) => onAnswer(event.target.value)} placeholder="请输入答案……" rows={question.number === 37 ? 4 : 2} /> : <div className="junior-high-options">{question.options.map((option) => <button className={value === option[0] ? "selected" : ""} key={option} onClick={() => onAnswer(option[0])} type="button">{option}</button>)}</div>}
      {submitted ? <div className="junior-high-feedback"><span>你的答案：{value || "未作答"}</span><span>{isOpenResponse ? "参考答案" : "正确答案"}：{question.answer}</span><span className={isOpenResponse ? "manual" : isCorrect ? "correct" : "incorrect"}>{isOpenResponse ? "人工复核" : isCorrect ? "✓ 正确" : "✕ 请查看解析"}</span><button onClick={() => setShowAnalysis(!showAnalysis)} type="button">解析</button>{showAnalysis ? <div className="junior-high-analysis"><strong>解析</strong><button onClick={() => setShowAnalysis(false)} type="button">关闭</button><p>{question.analysis}</p></div> : null}</div> : null}
    </article>
  );
}

function PassageGroup({ title, context, questions, answers, submitted, onAnswer }: { title: string; context: string; questions: PaperQuestion[]; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void }) {
  return <section className="junior-high-passage-layout"><div className="junior-high-passage-column"><h2>{title}</h2><div>{context}</div></div><div className="junior-high-passage-questions">{questions.map((question) => <PaperQuestionCard cloze={title === "完形填空"} key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>;
}

export function BeijingPaperWorkbench({ onBack }: { onBack: () => void }) {
  const [running, setRunning] = useState(true);
  const [seconds, setSeconds] = useState(paper.durationMinutes * 60);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writing, setWriting] = useState("");
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

  return <section className={`stack junior-high-page junior-high-exam-page ${isFullscreen ? "fullscreen" : ""}`} data-local-selection-actions="true" ref={pageRef}><div className="junior-high-exam-toolbar"><button className="junior-high-back" onClick={onBack} type="button">← 返回选择</button><div className="junior-high-exam-toolbar-title"><strong>中考英语 · 真题模考</strong><span>北京模拟卷</span></div><PaperTimer onToggle={() => setRunning(!running)} running={running} seconds={seconds} /><div className="junior-high-toolbar-actions"><button className={`annotation-toggle ielts-exam-action ielts-fullscreen-toggle ${isFullscreen ? "active" : ""}`} onClick={() => void toggleFullscreen()} type="button">{isFullscreen ? "退出全屏" : "全屏"}</button><StudyAnnotationTools buttonClassName="annotation-toggle ielts-exam-action" sourceHref="/junior-high" sourceId="junior-high:2024-beijing-simulation" sourceTitle={paper.fileName} surfaceRef={pageRef} /></div></div><div className="junior-high-exam-source">原卷文件：{paper.fileName}<br />解析文件：{paper.analysisFileName}</div><QuestionNavigation current={current} onSelect={selectQuestion} /><div className="junior-high-paper-content"><section className="junior-high-paper-section"><h2>一、单项填空</h2><div className="junior-high-question-stack">{byRange(1, 12).map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => handleAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section><section className="junior-high-paper-section"><PassageGroup context={paper.questions[12].context} questions={byRange(13, 20)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="完形填空" /></section><section className="junior-high-paper-section"><h2>三、阅读理解</h2><PassageGroup context={paper.questions[20].context} questions={byRange(21, 23)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · A" /><PassageGroup context={paper.questions[23].context} questions={byRange(24, 26)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · B" /><PassageGroup context={paper.questions[26].context} questions={byRange(27, 29)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · C" /><PassageGroup context={paper.questions[29].context} questions={byRange(30, 33)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · D" /></section><section className="junior-high-paper-section"><PassageGroup context={paper.questions[33].context} questions={byRange(34, 37)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读表达" /></section><article className="junior-high-paper-writing"><div className="junior-high-question-heading"><span>{paper.writing.title}</span><strong>写作</strong></div><p>{paper.writing.prompts}</p><p className="junior-high-writing-requirements">{paper.writing.requirements}</p><textarea value={writing} onChange={(event) => setWriting(event.target.value)} placeholder="请输入作文……" rows={9} />{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span></div> : null}</article></div><QuestionNavigation current={current} onSelect={selectQuestion} /><footer><span>{submitted ? `已提交 ${paper.questions.length} 道题` : `共 ${paper.questions.length} 道题 · 书面表达 1 题`}</span><button className="junior-high-submit" onClick={() => { setSubmitted(true); setRunning(false); }} type="button">提交答卷</button></footer></section>;
}
