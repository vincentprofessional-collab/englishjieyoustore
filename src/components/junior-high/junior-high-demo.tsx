"use client";

import { useState } from "react";
import { JuniorHighPaperWorkbench } from "@/components/junior-high/beijing-paper-workbench";
import { getJuniorHighPaper, JUNIOR_HIGH_PAPER_CATALOG } from "@/lib/junior-high/paper-catalog";
import type { JuniorHighPaper } from "@/lib/junior-high/paper-types";
import {
  JUNIOR_HIGH_SAMPLES,
  type JuniorHighSample,
} from "@/lib/junior-high/sample-data";

type Mode = "home" | "mock-select" | "practice-select" | "mock" | "practice";

const AVAILABLE_JUNIOR_HIGH_PAPERS = JUNIOR_HIGH_PAPER_CATALOG.filter((paper) => paper.questions.length > 0);
const AVAILABLE_JUNIOR_HIGH_YEARS = [...new Set(AVAILABLE_JUNIOR_HIGH_PAPERS.map((paper) => paper.year))].sort((a, b) => b - a);

function regionsForYear(year: number) {
  return [...new Set(AVAILABLE_JUNIOR_HIGH_PAPERS.filter((paper) => paper.year === year).map((paper) => paper.region))];
}

function practiceSectionMatches(type: JuniorHighSample["type"], title: string) {
  const value = title.toLowerCase();
  if (type === "listening") return /听力|听说|listening/.test(value);
  if (type === "grammar") return /单项|语法|语言知识|grammar/.test(value);
  if (type === "cloze") return /完形|cloze/.test(value);
  if (type === "reading") return /阅读理解|reading/.test(value) && !/表达|任务|还原|填表/.test(value);
  if (type === "reading-response") return /阅读表达|任务型|阅读还原|阅读填表|reading response/.test(value);
  if (type === "vocabulary") return /词汇|语法填空|首字母|单词|综合填空|vocabulary/.test(value);
  if (type === "dialogue") return /对话|情景|补全|dialogue/.test(value);
  return type === "writing" && /写作|作文|书面表达|文段表达|writing/.test(value);
}

function createPracticePaper(paper: JuniorHighPaper, type: JuniorHighSample["type"], label: string): JuniorHighPaper | null {
  if (type === "writing") {
    return { ...paper, displayTitle: `${paper.displayTitle ?? paper.label} · ${label}`, sections: [], questions: [] };
  }
  if (!paper.sections?.length) {
    const questions = paper.questions.filter((question) => question.type === type || (type === "reading-response" && question.type === "reading-response") || (type === "vocabulary" && question.type === "vocabulary"));
    return questions.length ? { ...paper, displayTitle: `${paper.displayTitle ?? paper.label} · ${label}`, questions } : null;
  }
  const sections = paper.sections.map((section) => {
    const matches = practiceSectionMatches(type, section.title);
    const questionIds = matches ? section.questionIds : [];
    return { ...section, blocks: matches ? section.blocks : [], questionIds };
  }).filter((section) => section.questionIds.length > 0);
  const questionIds = new Set(sections.flatMap((section) => section.questionIds));
  const questions = paper.questions.filter((question) => questionIds.has(question.id));
  return questions.length ? { ...paper, displayTitle: `${paper.displayTitle ?? paper.label} · ${label}`, sections, questions } : null;
}

export function JuniorHighDemo() {
  const [mode, setMode] = useState<Mode>("home");
  const [year, setYear] = useState(AVAILABLE_JUNIOR_HIGH_YEARS[0] ?? 2024);
  const [region, setRegion] = useState("北京");
  const [type, setType] = useState(JUNIOR_HIGH_SAMPLES[0].type);
  const availableRegions = regionsForYear(year);
  const openMode = (next: Mode) => setMode(next);
  const changeYear = (nextYear: number) => {
    setYear(nextYear);
    const nextRegions = regionsForYear(nextYear);
    if (!nextRegions.includes(region)) setRegion(nextRegions[0] ?? "");
  };
  const canConfirm = Boolean(year && region && (mode !== "practice-select" || type));

  if (mode === "home") return <section className="stack junior-high-page"><div className="writing-hero-panel ielts-module-hero"><div className="writing-hero-copy"><h1>中考英语</h1></div></div><div className="writing-mode-panel"><div className="writing-mode-grid"><button className="writing-mode-card practice" onClick={() => openMode("practice-select")} type="button"><span>题型训练</span><strong>题型练习</strong><p>选择题型、年份和地区，默认不计时，可手动开始计时。</p><em>选择训练内容 →</em></button><button className="writing-mode-card mock" onClick={() => openMode("mock-select")} type="button"><span>完整试卷</span><strong>真题模考</strong><p>按原卷考试时间自动计时，提交后查看答案与解析。</p><em>选择年份和地区 →</em></button></div></div></section>;

  if (mode === "mock-select" || mode === "practice-select") return <section className="stack junior-high-page"><div className="junior-high-selection"><button className="junior-high-back" onClick={() => setMode("home")} type="button">← 返回中考英语</button><h1>{mode === "mock-select" ? "真题模考" : "题型练习"}</h1><div className="junior-high-selection-step"><span>1</span><div><strong>选择年份</strong><div className="junior-high-chip-row">{AVAILABLE_JUNIOR_HIGH_YEARS.map((item) => <button className={year === item ? "selected" : ""} key={item} onClick={() => changeYear(item)} type="button">{item}年</button>)}</div></div></div>{mode === "practice-select" ? <div className="junior-high-selection-step"><span>2</span><div><strong>选择题型</strong><div className="junior-high-type-list">{JUNIOR_HIGH_SAMPLES.map((item) => <button className={type === item.type ? "selected" : ""} key={item.type} onClick={() => setType(item.type)} type="button">{item.label}</button>)}</div></div></div> : null}<div className="junior-high-selection-step"><span>{mode === "practice-select" ? "3" : "2"}</span><div><strong>选择地区</strong><div className="junior-high-chip-row">{availableRegions.map((item) => <button className={region === item ? "selected" : ""} key={item} onClick={() => setRegion(item)} type="button">{item}</button>)}</div></div></div><div className="junior-high-selection-actions"><button className="junior-high-confirm" disabled={!canConfirm} onClick={() => openMode(mode === "mock-select" ? "mock" : "practice")} type="button">确认</button></div></div></section>;

  const sourcePaper = getJuniorHighPaper(year, region);
  const selectedSample = JUNIOR_HIGH_SAMPLES.find((sample) => sample.type === type) ?? JUNIOR_HIGH_SAMPLES[0];
  const catalogPaper = sourcePaper && mode === "practice" ? createPracticePaper(sourcePaper, type, selectedSample.label) : sourcePaper;
  if (catalogPaper) return <JuniorHighPaperWorkbench autoStart={mode === "mock"} key={`${mode}-${year}-${region}-${type}`} onBack={() => setMode(mode === "mock" ? "mock-select" : "practice-select")} paper={catalogPaper} timerMode={mode === "mock" ? "countdown" : "stopwatch"} />;

  return <section className="stack junior-high-page"><div className="junior-high-selection junior-high-selection-empty"><button className="junior-high-back" onClick={() => setMode(mode === "mock" ? "mock-select" : "practice-select")} type="button">← 返回选择</button><h1>暂未找到对应试卷</h1><p>{year} 年 · {region} · {mode === "mock" ? "真题模考" : selectedSample.label}</p><p>该年份和地区的完整原卷尚未接入，已停止样板题回退。请选择已有试卷后再进入。</p></div></section>;
}
