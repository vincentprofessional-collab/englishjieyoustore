"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SeniorHighLibraryEntry, SeniorHighLibraryIndex } from "@/lib/senior-high/v2-types";
import { SeniorHighKnowledge } from "./senior-high-knowledge";

type Entry = "knowledge" | "practice" | "papers";

const ENTRY_LABELS: Record<Entry, string> = { knowledge: "知识点", practice: "题型训练", papers: "历年真题" };

function practiceFamily(entry: SeniorHighLibraryEntry) {
  if (entry.title.includes("七选五")) return "七选五／阅读补全";
  if (entry.title.includes("完形")) return "完形填空";
  if (entry.title.includes("语法填空")) return "语法填空／语言运用";
  if (entry.title.includes("应用文")) return "应用文写作";
  if (entry.title.includes("读后续写")) return "读后续写";
  if (entry.title.includes("概要")) return "概要写作";
  if (entry.questionTypes.includes("oral_response")) return "广东等地区听说考试";
  return "综合题型";
}

function answerStatusLabel(entry: SeniorHighLibraryEntry) {
  if (entry.answerStatus === "answered") return "答案完整";
  if (entry.answerStatus === "partial") return `有答案 ${entry.answeredCount}/${entry.questionCount}`;
  if (entry.answerStatus === "conflict") return "答案待复核";
  return "暂无标准答案";
}

export function SeniorHighLibrary() {
  const [index, setIndex] = useState<SeniorHighLibraryIndex | null>(null);
  const [entry, setEntry] = useState<Entry>("practice");
  const [family, setFamily] = useState<string | null>(null);
  const [year, setYear] = useState("全部");
  const [region, setRegion] = useState("全部");
  const [answerStatus, setAnswerStatus] = useState("全部");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/senior-high/index.json").then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<SeniorHighLibraryIndex>;
    }).then((payload) => {
      setIndex(payload);
      const done = new Set<string>();
      for (const item of payload.entries) {
        try {
          const value = JSON.parse(window.localStorage.getItem(`senior-high:v2:2:${item.kind}:${item.id}`) || "null") as { submitted?: boolean } | null;
          if (value?.submitted) done.add(item.id);
        } catch { /* Ignore a damaged local attempt. */ }
      }
      setCompleted(done);
    }).catch(() => setError("高考英语目录暂时无法载入，请稍后刷新。"));
  }, []);

  const papers = index?.entries.filter((item) => item.kind === "paper") || [];
  const practice = index?.entries.filter((item) => item.kind === "practice") || [];
  const families = useMemo(() => [...new Set(practice.map(practiceFamily))], [practice]);
  const selectedPractice = practice.filter((item) => practiceFamily(item) === family);
  const years = [...new Set(papers.map((item) => item.year))].sort((a, b) => b.localeCompare(a));
  const regions = [...new Set(papers.map((item) => item.region))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const filteredPapers = papers.filter((item) => (year === "全部" || item.year === year) && (region === "全部" || item.region === region) && (answerStatus === "全部" || item.answerStatus === answerStatus));
  const groupedPapers = Object.entries(filteredPapers.reduce<Record<string, SeniorHighLibraryEntry[]>>((groups, item) => { (groups[item.year] ||= []).push(item); return groups; }, {})).sort(([left], [right]) => right.localeCompare(left));

  if (error) return <section className="senior-high-page"><div className="senior-high-alert">{error}</div></section>;
  if (!index) return <section className="senior-high-page"><div className="senior-high-loading">正在载入高考英语轻量目录…</div></section>;

  return <section className="senior-high-page">
    <div className="senior-high-hero"><div><div className="senior-high-eyebrow">SENIOR HIGH · ENGLISH</div><h1>高考英语学习中心</h1><p>文章、题目、选项按原资料题组分开保存；作答前不显示答案，提交后再判题并显示来源中已有的解析。</p></div><div className="senior-high-stats"><strong>{papers.length}</strong><span>套真实试卷</span><strong>{practice.reduce((sum, item) => sum + item.questionCount, 0)}</strong><span>道专项题</span></div></div>
    <nav className="senior-high-entry-tabs" aria-label="高考英语资料入口">{(Object.keys(ENTRY_LABELS) as Entry[]).map((key) => <button className={entry === key ? "selected" : ""} key={key} onClick={() => { setEntry(key); setFamily(null); }} type="button">{ENTRY_LABELS[key]}<small>{key === "knowledge" ? 349 : key === "practice" ? practice.length : papers.length}</small></button>)}</nav>
    {entry === "knowledge" ? <SeniorHighKnowledge /> : null}
    {entry === "practice" ? <div className="senior-high-section">{family === null ? <><h2>题型训练</h2><p className="senior-high-muted">先选择题型，再选择真实来源题组。完形、七选五和语法填空的文章只显示一次，正文空格与题号一一对应。</p><div className="senior-high-practice-family-grid">{families.map((name) => { const sets = practice.filter((item) => practiceFamily(item) === name); return <button className="senior-high-practice-family-card" key={name} onClick={() => setFamily(name)} type="button"><strong>{name}</strong><span>{sets.reduce((sum, item) => sum + item.questionCount, 0)} 题 · {sets.length} 组</span><small>已完成 {sets.filter((item) => completed.has(item.id)).length} 组 · 未完成 {sets.filter((item) => !completed.has(item.id)).length} 组</small></button>; })}</div></> : <><button className="senior-high-back" onClick={() => setFamily(null)} type="button">← 返回题型训练</button><h2>{family}</h2><p className="senior-high-muted">进入后专项题号从 1 连续排列，同时保留原资料题号；提交后有答案的自动判分，无答案的不误判。</p><div className="senior-high-practice-source-grid">{selectedPractice.map((item) => <Link className="senior-high-library-card" href={item.href} key={item.id}><strong>{item.title}</strong><span>{item.questionCount} 题 · {completed.has(item.id) ? "已完成" : "未完成"}</span><small>{item.year} · {item.region} · {answerStatusLabel(item)}</small></Link>)}</div></>}</div> : null}
    {entry === "papers" ? <div className="senior-high-section"><h2>历年真题</h2><p className="senior-high-muted">完整卷保留原卷分区、篇章和题号；空白卷与解析卷在导入阶段合并为同一套试卷。</p><div className="senior-high-v2-filters"><label>年份<select onChange={(event) => setYear(event.target.value)} value={year}><option>全部</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label><label>地区／卷型<select onChange={(event) => setRegion(event.target.value)} value={region}><option>全部</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></label><label>答案状态<select onChange={(event) => setAnswerStatus(event.target.value)} value={answerStatus}><option value="全部">全部</option><option value="answered">答案完整</option><option value="partial">部分有答案</option><option value="none">无标准答案</option><option value="conflict">答案待复核</option></select></label></div>{groupedPapers.map(([paperYear, entries]) => <div className="senior-high-group" key={paperYear}><h3>{paperYear} 年</h3><div className="senior-high-paper-grid">{entries.map((item) => <Link className="senior-high-paper-card" href={item.href} key={item.id}><strong>{item.region} · {item.variant}</strong><span>{item.title}</span><small>{item.questionCount} 题 · {answerStatusLabel(item)} · {completed.has(item.id) ? "已完成" : "开始作答"}</small></Link>)}</div></div>)}</div> : null}
  </section>;
}
