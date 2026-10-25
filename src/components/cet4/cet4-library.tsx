"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listExamContentOverrides } from "@/lib/exam-content/overrides";
import type { Cet4SetSummary } from "@/lib/cet4/library";

type KnowledgeSummary = { id: string; title: string; topic: string; excerpt: string };
type Entry = "knowledge" | "practice" | "papers";
type CetExam = "cet4" | "cet6";
const practiceOrder = ["听力理解", "听写填空", "选词填空", "长篇阅读", "仔细阅读", "词汇与语法", "完形填空", "翻译", "写作", "综合题型"];

function family(title: string, exam?: CetExam) {
  if (exam === "cet6" && /写作/.test(title)) return "写作";
  if (exam === "cet6" && /长篇阅读/.test(title)) return "长篇阅读";
  if (exam === "cet6" && /仔细阅读/.test(title)) return "仔细阅读";
  if (/听写|dictation/i.test(title)) return "听写填空";
  if (/听力|listening/i.test(title)) return exam === "cet6" ? "听力" : "听力理解";
  if (/翻译|translation/i.test(title)) return "翻译";
  if (/完形|cloze/i.test(title)) return "完形填空";
  if (/选词|word.bank/i.test(title)) return "选词填空";
  if (/长篇|匹配|skimming/i.test(title)) return "长篇阅读";
  if (/阅读|reading|surviving|textbook|sugar|integrity|merit/i.test(title)) return "仔细阅读";
  if (/词汇|语法|grammar/i.test(title)) return "词汇与语法";
  if (/写作|writing/i.test(title)) return "写作";
  return "综合题型";
}

function answerLabel(entry: Cet4SetSummary) {
  if (entry.answerStatus === "answered") return "本页答案齐全";
  if (entry.answeredCount > 0) return `有答案 ${entry.answeredCount}/${entry.questionCount}`;
  return "提交后查看可用答案";
}

function countQuestions(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countQuestions(item), 0);
  return Object.entries(value as Record<string, unknown>).reduce((sum, [key, child]) => {
    if (key === "questions" && Array.isArray(child)) {
      return sum + child.reduce((count, question) => {
        if (question && typeof question === "object" && Array.isArray((question as Record<string, unknown>).questionNumbers)) return count + ((question as Record<string, unknown>).questionNumbers as unknown[]).length;
        return count + 1;
      }, 0) + countQuestions(child);
    }
    return sum + countQuestions(child);
  }, 0);
}

export function Cet4Library({ knowledge, sets, exam = "cet4", initialEntry }: { knowledge: KnowledgeSummary[]; sets: Cet4SetSummary[]; exam?: CetExam; initialEntry?: Entry }) {
  const searchParams = useSearchParams();
  const [activeSets, setActiveSets] = useState(sets);
  const requestedEntry = searchParams.get("entry") === "knowledge" ? "papers" : searchParams.get("entry");
  const [entry, setEntry] = useState<Entry>(() => requestedEntry === "knowledge" || requestedEntry === "practice" || requestedEntry === "papers" ? requestedEntry : initialEntry ?? (sets.some((item) => item.kind === "practice") ? "practice" : knowledge.length ? "knowledge" : "papers"));
  const [topic, setTopic] = useState("全部");
  const [year, setYear] = useState("全部");
  const [region, setRegion] = useState("全部");

  useEffect(() => {
    if (requestedEntry === "knowledge" || requestedEntry === "practice" || requestedEntry === "papers") {
      setEntry(exam === "cet4" && requestedEntry === "knowledge" ? "papers" : requestedEntry);
    }
  }, [exam, requestedEntry]);
  useEffect(() => {
    let cancelled = false;
    setActiveSets(sets);
    async function loadOverrides() {
      const { overrides, error } = await listExamContentOverrides(exam);
      if (cancelled || error) return;
      const byId = new Map(overrides.map((item) => [item.bank_id, item]));
      const knownIds = new Set(sets.map((item) => item.id));
      const savedSets = sets.flatMap((item) => {
        const saved = byId.get(item.id);
        if (saved?.is_deleted) return [];
        const data = saved?.bank_data as Record<string, unknown> | null;
        if (!data) return [item];
        return [{
          ...item,
          title: typeof data.title === "string" ? data.title : item.title,
          year: typeof data.year === "string" ? data.year : item.year,
          region: typeof data.region === "string" ? data.region : item.region,
          variant: typeof data.variant === "string" ? data.variant : item.variant,
          questionCount: typeof data.questionCount === "number" ? data.questionCount : item.questionCount,
          answeredCount: typeof data.answeredCount === "number" ? data.answeredCount : item.answeredCount,
          explanationCount: typeof data.explanationCount === "number" ? data.explanationCount : item.explanationCount,
          answerStatus: data.answerStatus === "answered" || data.answerStatus === "partial" || data.answerStatus === "none" || data.answerStatus === "conflict" ? data.answerStatus : item.answerStatus,
          coverageNote: typeof data.coverageNote === "string" ? data.coverageNote : item.coverageNote,
        }];
      });
      const addedSets = overrides.flatMap((saved) => {
        const data = saved.bank_data as Record<string, unknown> | null;
        if (knownIds.has(saved.bank_id) || saved.is_deleted || !data) return [];
        const kind: "paper" | "practice" = data.kind === "practice" ? "practice" : "paper";
        const year = String(data.year || "未标年份");
        const title = typeof data.title === "string" ? data.title : saved.title || saved.bank_id;
        const count = typeof data.questionCount === "number" ? data.questionCount : countQuestions(data);
        const answered = typeof data.answeredCount === "number" ? data.answeredCount : typeof data.answerCount === "number" ? data.answerCount : 0;
        return [{
          id: saved.bank_id,
          kind,
          title,
          year,
          region: typeof data.region === "string" ? data.region : "全国",
          variant: typeof data.variant === "string" ? data.variant : "",
          questionCount: count,
          answeredCount: answered,
          explanationCount: typeof data.explanationCount === "number" ? data.explanationCount : 0,
          answerStatus: answered > 0 ? answered >= count ? "answered" as const : "partial" as const : "none" as const,
          questionTypes: [],
          href: "/" + exam + "/" + encodeURIComponent(saved.bank_id) + "?kind=" + kind,
          quality: { structureStatus: "approved", structureConfidence: 1, issueCount: 0 },
        }];
      });
      setActiveSets([...savedSets, ...addedSets]);
    }
    void loadOverrides();
    return () => { cancelled = true; };
  }, [exam, sets]);
  const practice = activeSets.filter((item) => item.kind === "practice");
  const papers = activeSets.filter((item) => item.kind === "paper");
  const topics = useMemo(() => ["全部", ...(exam === "cet6" ? ["写作", "听力", "选词填空", "长篇阅读", "仔细阅读", "翻译"] : practiceOrder).filter((name) => practice.some((item) => family(item.title, exam) === name))], [practice, exam]);
  const years = useMemo(() => [...new Set(papers.map((item) => item.year).filter(Boolean))].sort((a, b) => b.localeCompare(a)), [papers]);
  const regions = useMemo(() => [...new Set(papers.map((item) => item.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN")), [papers]);
  const visiblePractice = practice.filter((item) => topic === "全部" || family(item.title, exam) === topic);
  const visiblePapers = papers.filter((item) => (year === "全部" || item.year === year) && (region === "全部" || item.region === region));
  const groupedPapers = Object.entries(visiblePapers.reduce<Record<string, Cet4SetSummary[]>>((groups, item) => { (groups[item.year || "未标年份"] ||= []).push(item); return groups; }, {})).sort(([a], [b]) => b.localeCompare(a));

  return <section className="senior-high-page">
    {entry === "knowledge" ? <div className="senior-high-section"><div className="senior-high-card-grid">{knowledge.map((item) => <Link className="senior-high-topic-card" href={`/${exam}/${item.id}`} key={item.id}><strong>{item.topic}</strong><span>{item.title}</span><small>{item.excerpt || "进入知识点讲解"}</small></Link>)}</div></div> : null}
    {entry === "practice" ? <div className="senior-high-section"><div className="senior-high-v2-filters"><label>题型<select onChange={(event) => setTopic(event.target.value)} value={topic}>{topics.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="senior-high-practice-family-grid">{visiblePractice.map((item) => <Link className="senior-high-practice-family-card" href={item.href} key={item.id}><strong>{item.title}</strong><span>{family(item.title, exam)} · {item.questionCount} 题</span><small>{answerLabel(item)} · 开始作答</small>{item.coverageNote ? <small>{item.coverageNote}</small> : null}</Link>)}</div></div> : null}
    {entry === "papers" ? <div className="senior-high-section"><div className="senior-high-v2-filters"><label>年份<select onChange={(event) => setYear(event.target.value)} value={year}><option>全部</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label><label>地区／卷型<select onChange={(event) => setRegion(event.target.value)} value={region}><option>全部</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></label></div>{groupedPapers.map(([paperYear, yearEntries]) => <div className="senior-high-group" key={paperYear}><h3>{paperYear} 年</h3><div className="senior-high-paper-grid">{yearEntries.map((item) => <Link className="senior-high-paper-card" href={item.href} key={item.id}><strong>{item.region}{item.variant ? ` · ${item.variant}` : ""}</strong><span>{item.title}</span><small>{exam === "cet6" ? item.questionCount === 2 ? "写作与翻译 · " : item.questionCount === 32 ? "写作、阅读与翻译 · " : item.year === "2015" ? "听力25题版 · " : "含听力 · " : ""}{item.questionCount} 题 · {answerLabel(item)} · 开始作答</small>{item.coverageNote ? <small>{item.coverageNote}</small> : null}</Link>)}</div></div>)}</div> : null}
  </section>;
}
