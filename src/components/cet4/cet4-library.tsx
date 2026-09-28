"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Cet4SetSummary } from "@/lib/cet4/library";

type KnowledgeSummary = { id: string; title: string; topic: string; excerpt: string };
type Entry = "knowledge" | "practice" | "papers";
type CetExam = "cet4" | "cet6";
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

export function Cet4Library({ knowledge, sets, exam = "cet4", initialEntry }: { knowledge: KnowledgeSummary[]; sets: Cet4SetSummary[]; exam?: CetExam; initialEntry?: Entry }) {
  const searchParams = useSearchParams();
  const requestedEntry = searchParams.get("entry");
  const [entry, setEntry] = useState<Entry>(() => initialEntry ?? (sets.some((item) => item.kind === "practice") ? "practice" : knowledge.length ? "knowledge" : "papers"));
  const [topic, setTopic] = useState("全部");
  const [year, setYear] = useState("全部");
  const [region, setRegion] = useState("全部");

  useEffect(() => {
    if (requestedEntry === "knowledge" || requestedEntry === "practice" || requestedEntry === "papers") {
      setEntry(requestedEntry);
    }
  }, [requestedEntry]);
  const practice = sets.filter((item) => item.kind === "practice");
  const papers = sets.filter((item) => item.kind === "paper");
  const topics = useMemo(() => ["全部", ...practiceOrder.filter((name) => practice.some((item) => family(item.title) === name))], [practice]);
  const years = useMemo(() => [...new Set(papers.map((item) => item.year).filter(Boolean))].sort((a, b) => b.localeCompare(a)), [papers]);
  const regions = useMemo(() => [...new Set(papers.map((item) => item.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN")), [papers]);
  const visiblePractice = practice.filter((item) => topic === "全部" || family(item.title) === topic);
  const visiblePapers = papers.filter((item) => (year === "全部" || item.year === year) && (region === "全部" || item.region === region));
  const groupedPapers = Object.entries(visiblePapers.reduce<Record<string, Cet4SetSummary[]>>((groups, item) => { (groups[item.year || "未标年份"] ||= []).push(item); return groups; }, {})).sort(([a], [b]) => b.localeCompare(a));

  return <section className="senior-high-page">
    {entry === "knowledge" ? <div className="senior-high-section"><div className="senior-high-card-grid">{knowledge.map((item) => <Link className="senior-high-topic-card" href={`/${exam}/${item.id}`} key={item.id}><strong>{item.topic}</strong><span>{item.title}</span><small>{item.excerpt || "进入知识点讲解"}</small></Link>)}</div></div> : null}
    {entry === "practice" ? <div className="senior-high-section"><div className="senior-high-v2-filters"><label>题型<select onChange={(event) => setTopic(event.target.value)} value={topic}>{topics.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="senior-high-practice-family-grid">{visiblePractice.map((item) => <Link className="senior-high-practice-family-card" href={item.href} key={item.id}><strong>{item.title}</strong><span>{family(item.title)} · {item.questionCount} 题</span><small>{answerLabel(item)} · 开始作答</small></Link>)}</div></div> : null}
    {entry === "papers" ? <div className="senior-high-section"><div className="senior-high-v2-filters"><label>年份<select onChange={(event) => setYear(event.target.value)} value={year}><option>全部</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label><label>地区／卷型<select onChange={(event) => setRegion(event.target.value)} value={region}><option>全部</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></label></div>{groupedPapers.map(([paperYear, yearEntries]) => <div className="senior-high-group" key={paperYear}><h3>{paperYear} 年</h3><div className="senior-high-paper-grid">{yearEntries.map((item) => <Link className="senior-high-paper-card" href={item.href} key={item.id}><strong>{item.region}{item.variant ? ` · ${item.variant}` : ""}</strong><span>{item.title}</span><small>{item.questionCount} 题 · {answerLabel(item)} · 开始作答</small></Link>)}</div></div>)}</div> : null}
  </section>;
}
