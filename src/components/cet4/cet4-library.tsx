"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Cet4SetSummary } from "@/lib/cet4/library";

type KnowledgeSummary = { id: string; title: string; topic: string; excerpt: string };
type Entry = "knowledge" | "practice" | "papers";
const labels: Record<Entry, string> = { knowledge: "知识点", practice: "题型训练", papers: "历年试卷" };
const practiceOrder = ["听力", "翻译", "选词填空", "阅读", "综合题型"];

function family(title: string) {
  if (/听力|listening/i.test(title)) return "听力";
  if (/翻译|translation/i.test(title)) return "翻译";
  if (/选词|cloze|完形/i.test(title)) return "选词填空";
  if (/阅读|匹配|reading|surviving|textbook|sugar|integrity|merit/i.test(title)) return "阅读";
  return "综合题型";
}

function answerLabel(entry: Cet4SetSummary) {
  if (entry.answerStatus === "answered") return "答案完整";
  if (entry.answeredCount > 0) return `有答案 ${entry.answeredCount}/${entry.questionCount}`;
  return "提交后查看可用答案";
}

export function Cet4Library({ knowledge, sets }: { knowledge: KnowledgeSummary[]; sets: Cet4SetSummary[] }) {
  const [entry, setEntry] = useState<Entry>("practice");
  const [topic, setTopic] = useState("全部");
  const [year, setYear] = useState("全部");
  const [region, setRegion] = useState("全部");
  const practice = sets.filter((item) => item.kind === "practice");
  const papers = sets.filter((item) => item.kind === "paper");
  const topics = useMemo(() => ["全部", ...practiceOrder.filter((name) => practice.some((item) => family(item.title) === name))], [practice]);
  const years = useMemo(() => [...new Set(papers.map((item) => item.year).filter(Boolean))].sort((a, b) => b.localeCompare(a)), [papers]);
  const regions = useMemo(() => [...new Set(papers.map((item) => item.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN")), [papers]);
  const visiblePractice = practice.filter((item) => topic === "全部" || family(item.title) === topic);
  const visiblePapers = papers.filter((item) => (year === "全部" || item.year === year) && (region === "全部" || item.region === region));
  const groupedPapers = Object.entries(visiblePapers.reduce<Record<string, Cet4SetSummary[]>>((groups, item) => { (groups[item.year || "未标年份"] ||= []).push(item); return groups; }, {})).sort(([a], [b]) => b.localeCompare(a));

  return <section className="senior-high-page">
    <div className="senior-high-hero"><div><div className="senior-high-eyebrow">LANGUAGE EXAMS · CET-4</div><h1>大学英语四级学习中心</h1><p>按高考英语题组结构整理四级资料：知识点、题型训练和历年试卷分开进入；文章、题干、选项和答题区按来源题组呈现。</p></div><div className="senior-high-stats"><strong>{papers.length}</strong><span>套试卷</span><strong>{practice.reduce((sum, item) => sum + item.questionCount, 0)}</strong><span>道专项题</span></div></div>
    <nav className="senior-high-entry-tabs" aria-label="四级资料入口">{(Object.keys(labels) as Entry[]).map((key) => <button className={entry === key ? "selected" : ""} key={key} onClick={() => { setEntry(key); setTopic("全部"); }} type="button">{labels[key]}<small>{key === "knowledge" ? knowledge.length : key === "practice" ? practice.length : papers.length}</small></button>)}</nav>
    {entry === "knowledge" ? <div className="senior-high-section"><h2>知识点</h2><p className="senior-high-muted">独立讲解与备考方法按听力、阅读、写作归类；知识点页不混入整套试卷题目。</p><div className="senior-high-card-grid">{knowledge.map((item) => <Link className="senior-high-topic-card" href={`/cet4/${item.id}`} key={item.id}><strong>{item.topic}</strong><span>{item.title}</span><small>{item.excerpt || "进入知识点讲解"}</small></Link>)}</div></div> : null}
    {entry === "practice" ? <div className="senior-high-section"><h2>题型训练</h2><p className="senior-high-muted">点击题型直接进入做题页；同一资料的文章与题目保持题组关系，提交本组后再显示可用答案。</p><div className="senior-high-v2-filters"><label>题型<select onChange={(event) => setTopic(event.target.value)} value={topic}>{topics.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="senior-high-practice-family-grid">{visiblePractice.map((item) => <Link className="senior-high-practice-family-card" href={item.href} key={item.id}><strong>{item.title}</strong><span>{family(item.title)} · {item.questionCount} 题</span><small>{answerLabel(item)} · 开始作答</small></Link>)}</div></div> : null}
    {entry === "papers" ? <div className="senior-high-section"><h2>历年试卷</h2><p className="senior-high-muted">完整卷保留原卷分区、篇章、题号和听力音频；整卷提交后统一查看可用答案与参考内容。</p><div className="senior-high-v2-filters"><label>年份<select onChange={(event) => setYear(event.target.value)} value={year}><option>全部</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label><label>地区／卷型<select onChange={(event) => setRegion(event.target.value)} value={region}><option>全部</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></label></div>{groupedPapers.map(([paperYear, yearEntries]) => <div className="senior-high-group" key={paperYear}><h3>{paperYear} 年</h3><div className="senior-high-paper-grid">{yearEntries.map((item) => <Link className="senior-high-paper-card" href={item.href} key={item.id}><strong>{item.region}{item.variant ? ` · ${item.variant}` : ""}</strong><span>{item.title}</span><small>{item.questionCount} 题 · {answerLabel(item)} · 开始作答</small></Link>)}</div></div>)}</div> : null}
  </section>;
}
