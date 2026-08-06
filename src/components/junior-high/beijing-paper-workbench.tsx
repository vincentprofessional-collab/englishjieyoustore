"use client";

import { useEffect, useState } from "react";
import paper from "@/lib/junior-high/beijing-2024-simulation.json";

type PaperQuestion = (typeof paper.questions)[number];

function PaperTimer({ running, seconds, onToggle }: { running: boolean; seconds: number; onToggle: () => void }) {
  const negative = seconds < 0;
  const absolute = Math.abs(seconds);
  const text = `${negative ? "-" : ""}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  return <button className={`junior-high-timer ${negative ? "is-over" : ""}`} onClick={onToggle} type="button">{text} · {running ? "暂停" : "开始"}</button>;
}

function PaperQuestionCard({ question, value, submitted, onAnswer, showContext }: { question: PaperQuestion; value: string; submitted: boolean; onAnswer: (value: string) => void; showContext: boolean }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isOpenResponse = question.options.length === 0;
  const isCorrect = !isOpenResponse && value === question.answer;
  return (
    <article className="junior-high-question-card">
      <div className="junior-high-question-heading"><span>{question.type === "grammar" ? "单项填空" : question.type === "cloze" ? "完形填空" : question.type === "reading" ? "阅读理解" : "阅读表达"}</span><strong>第 {question.number} 题</strong></div>
      {showContext && question.context ? <div className="junior-high-passage">{question.context}</div> : null}
      <p className="junior-high-question-prompt">{question.prompt}</p>
      {isOpenResponse ? <textarea value={value} onChange={(event) => onAnswer(event.target.value)} placeholder="请输入答案……" rows={question.number === 37 ? 4 : 2} /> : <div className="junior-high-options">{question.options.map((option) => <button className={value === option[0] ? "selected" : ""} key={option} onClick={() => onAnswer(option[0])} type="button">{option}</button>)}</div>}
      {submitted ? <div className="junior-high-feedback"><span>你的答案：{value || "未作答"}</span><span>{isOpenResponse ? "参考答案" : "正确答案"}：{question.answer}</span><span className={isOpenResponse ? "manual" : isCorrect ? "correct" : "incorrect"}>{isOpenResponse ? "人工复核" : isCorrect ? "✓ 正确" : "✕ 请查看解析"}</span><button onClick={() => setShowAnalysis(!showAnalysis)} type="button">解析</button>{showAnalysis ? <div className="junior-high-analysis"><strong>解析</strong><button onClick={() => setShowAnalysis(false)} type="button">关闭</button><p>{question.analysis}</p></div> : null}</div> : null}
    </article>
  );
}

export function BeijingPaperWorkbench({ onBack }: { onBack: () => void }) {
  const [running, setRunning] = useState(true);
  const [seconds, setSeconds] = useState(paper.durationMinutes * 60);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writing, setWriting] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const visibleQuestions = submitted ? paper.questions : [paper.questions[current]];
  return <section className="stack junior-high-page"><div className="junior-high-workbench"><header><div><button className="junior-high-back" onClick={onBack} type="button">← 返回选择</button><h1>中考英语 · 真题模考</h1><p className="junior-high-source-name">北京模拟卷 · 文件：{paper.fileName}</p></div><PaperTimer running={running} seconds={seconds} onToggle={() => setRunning(!running)} /></header><div className="junior-high-paper-nav">{paper.questions.map((question, index) => <button className={current === index ? "selected" : ""} key={question.id} onClick={() => setCurrent(index)} type="button">{question.number}</button>)}</div><div className="junior-high-paper-content">{visibleQuestions.map((question) => <PaperQuestionCard key={question.id} question={question} value={answers[question.id] || ""} submitted={submitted} onAnswer={(value) => setAnswers((previous) => ({ ...previous, [question.id]: value }))} showContext={!submitted || question.number === 1 || question.number === 13 || question.number === 21 || question.number === 24 || question.number === 27 || question.number === 30 || question.number === 34} />)}<article className="junior-high-paper-writing"><div className="junior-high-question-heading"><span>{paper.writing.title}</span><strong>写作</strong></div><p>{paper.writing.prompts}</p><p className="junior-high-writing-requirements">{paper.writing.requirements}</p><textarea value={writing} onChange={(event) => setWriting(event.target.value)} placeholder="请输入作文……" rows={9} />{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span><button type="button">说明</button></div> : null}</article></div><footer><span>{submitted ? `已提交 ${paper.questions.length} 道题` : `当前第 ${paper.questions[current].number} 题，共 ${paper.questions.length} 题`}</span><button className="junior-high-submit" onClick={() => { setSubmitted(true); setRunning(false); }} type="button">提交答卷</button></footer></div></section>;
}
