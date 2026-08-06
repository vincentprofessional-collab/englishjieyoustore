"use client";

import { useEffect, useMemo, useState } from "react";
import { BeijingPaperWorkbench } from "@/components/junior-high/beijing-paper-workbench";
import {
  JUNIOR_HIGH_REGIONS,
  JUNIOR_HIGH_SAMPLES,
  JUNIOR_HIGH_YEARS,
  MOCK_SAMPLE,
  type JuniorHighSample,
} from "@/lib/junior-high/sample-data";

type Mode = "home" | "mock-select" | "practice-select" | "mock" | "practice";

function Timer({ running, seconds, onToggle }: { running: boolean; seconds: number; onToggle: () => void }) {
  const negative = seconds < 0;
  const absolute = Math.abs(seconds);
  const text = `${negative ? "-" : ""}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  return <button className={`junior-high-timer ${negative ? "is-over" : ""}`} onClick={onToggle} type="button">{text} · {running ? "暂停" : "开始"}</button>;
}

function SampleQuestion({ sample, submitted }: { sample: JuniorHighSample; submitted: boolean }) {
  const [value, setValue] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isWriting = sample.type === "writing" || sample.type === "reading-response" || sample.type === "vocabulary";
  return (
    <article className="junior-high-question-card">
      <div className="junior-high-question-heading"><span>{sample.label}</span><strong>第 1 题</strong></div>
      {sample.passage ? <div className="junior-high-passage">{sample.passage}</div> : null}
      <p className="junior-high-question-prompt">{sample.prompt}</p>
      {isWriting ? (
        <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="请输入答案……" rows={sample.type === "writing" ? 8 : 2} />
      ) : (
        <div className="junior-high-options">{sample.options?.map((option) => <button className={value === option[0] ? "selected" : ""} key={option} onClick={() => setValue(option[0])} type="button">{option}</button>)}</div>
      )}
      {submitted ? (
        <div className="junior-high-feedback"><span>你的答案：{value || "未作答"}</span><span>正确答案：{sample.answer}</span><span className={value === sample.answer ? "correct" : "incorrect"}>{value === sample.answer ? "✓ 正确" : "✕ 请查看解析"}</span><button onClick={() => setShowAnalysis(!showAnalysis)} type="button">解析</button>{showAnalysis ? <div className="junior-high-analysis"><strong>解析</strong><button onClick={() => setShowAnalysis(false)} type="button">关闭</button><p>{sample.analysis}</p></div> : null}</div>
      ) : null}
    </article>
  );
}

export function JuniorHighDemo() {
  const [mode, setMode] = useState<Mode>("home");
  const [year, setYear] = useState(2024);
  const [region, setRegion] = useState("北京");
  const [type, setType] = useState(JUNIOR_HIGH_SAMPLES[0].type);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const selected = useMemo(() => JUNIOR_HIGH_SAMPLES.find((sample) => sample.type === type) ?? JUNIOR_HIGH_SAMPLES[0], [type]);

  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds((current) => mode === "mock" ? current - 1 : current + 1), 1000); return () => window.clearInterval(timer); }, [mode, running]);
  const openMode = (next: Mode) => { setMode(next); setRunning(next === "mock"); setSubmitted(false); setSeconds(next === "mock" ? MOCK_SAMPLE.durationMinutes * 60 : 0); };
  const canConfirm = Boolean(year && region && (mode !== "practice-select" || type));

  if (mode === "home") return <section className="stack junior-high-page"><div className="writing-hero-panel ielts-module-hero"><div className="writing-hero-copy"><h1>中考英语</h1></div></div><div className="writing-mode-panel"><div className="writing-mode-grid"><button className="writing-mode-card practice" onClick={() => openMode("practice-select")} type="button"><span>题型训练</span><strong>题型练习</strong><p>选择题型、年份和地区，默认不计时，可手动开始计时。</p><em>选择训练内容 →</em></button><button className="writing-mode-card mock" onClick={() => openMode("mock-select")} type="button"><span>完整试卷</span><strong>真题模考</strong><p>按原卷考试时间自动计时，提交后查看答案与解析。</p><em>选择年份和地区 →</em></button></div></div></section>;

  if (mode === "mock-select" || mode === "practice-select") return <section className="stack junior-high-page"><div className="junior-high-selection"><button className="junior-high-back" onClick={() => setMode("home")} type="button">← 返回中考英语</button><h1>{mode === "mock-select" ? "真题模考" : "题型练习"}</h1><div className="junior-high-selection-step"><span>1</span><div><strong>选择年份</strong><div className="junior-high-chip-row">{JUNIOR_HIGH_YEARS.map((item) => <button className={year === item ? "selected" : ""} key={item} onClick={() => setYear(item)} type="button">{item}年</button>)}</div></div></div>{mode === "practice-select" ? <div className="junior-high-selection-step"><span>2</span><div><strong>选择题型</strong><div className="junior-high-type-list">{JUNIOR_HIGH_SAMPLES.map((item) => <button className={type === item.type ? "selected" : ""} key={item.type} onClick={() => setType(item.type)} type="button">{item.label}</button>)}</div></div></div> : null}<div className="junior-high-selection-step"><span>{mode === "practice-select" ? "3" : "2"}</span><div><strong>选择地区</strong><div className="junior-high-chip-row">{JUNIOR_HIGH_REGIONS.map((item) => <button className={region === item ? "selected" : ""} key={item} onClick={() => setRegion(item)} type="button">{item}</button>)}</div></div></div><div className="junior-high-selection-actions"><button className="junior-high-confirm" disabled={!canConfirm} onClick={() => openMode(mode === "mock-select" ? "mock" : "practice")} type="button">确认</button></div></div></section>;

  if (mode === "mock" && year === 2024 && region === "北京") return <BeijingPaperWorkbench onBack={() => setMode("mock-select")} />;

  const sample = mode === "mock" ? JUNIOR_HIGH_SAMPLES[3] : selected;
  return <section className="stack junior-high-page"><div className="junior-high-workbench"><header><div><button className="junior-high-back" onClick={() => setMode(mode === "mock" ? "mock-select" : "practice-select")} type="button">← 返回选择</button><h1>中考英语 · {mode === "mock" ? "真题模考" : "题型练习"}</h1><p>{year} 年 · {region} · {mode === "mock" ? MOCK_SAMPLE.paperLabel : sample.label}</p></div><Timer running={running} seconds={seconds} onToggle={() => setRunning(!running)} /></header><div className="junior-high-workspace-grid">{sample.passage ? <div className="junior-high-reading-pane"><span>阅读材料</span><p>{sample.passage}</p></div> : null}<div className="junior-high-question-pane"><SampleQuestion sample={sample} submitted={submitted} /></div></div><footer><span>样板题目 1 / 1</span><button className="junior-high-submit" onClick={() => { setSubmitted(true); setRunning(false); }} type="button">提交答卷</button></footer></div></section>;
}
