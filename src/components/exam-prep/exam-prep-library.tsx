"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { listExamContentOverrides } from "@/lib/exam-content/overrides";

type ExamId = "postgraduate" | "gre" | "gmat";
type Entry = { id: string; title: string; category?: string; kind: string; year?: string; subject?: string; questionCount: number; answerCount?: number; reviewCount?: number; href: string; source?: string; unitLabel?: string; groupCount?: number; referenceGroupCount?: number };
type IndexData = { entries: Entry[] };
type Tab = "knowledge" | "practice" | "papers";

function countQuestions(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countQuestions(item), 0);
  return Object.entries(value as Record<string, unknown>).reduce((sum, [key, child]) => {
    if (key === "questions" && Array.isArray(child)) return sum + child.length + countQuestions(child);
    return sum + countQuestions(child);
  }, 0);
}

const labels: Record<ExamId, { title: string; subtitle: string; vocab: string }> = {
  postgraduate: { title: "考研英语学习中心", subtitle: "按历年完整试卷或题型练习；提交后查看答案与解析。", vocab: "考研" },
  gre: { title: "GRE 学习中心", subtitle: "按填空、阅读理解和逻辑推理练习；提交后查看答案与来源解析。", vocab: "GRE" },
  gmat: { title: "GMAT 学习中心", subtitle: "按题型进行专项练习；提交后查看答案与解析。", vocab: "GMAT" },
};

export function ExamPrepLibrary({ exam }: { exam: ExamId }) {
  const search = useSearchParams();
  const requested = search.get("entry");
  const [tab, setTab] = useState<Tab>(() => requested === "papers" || requested === "knowledge" || requested === "practice" ? requested : exam === "postgraduate" ? "papers" : "practice");
  const [index, setIndex] = useState<IndexData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (requested === "papers" || requested === "knowledge" || requested === "practice") setTab(requested);
  }, [requested]);
  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const response = await fetch("/exam-prep/" + exam + "/index.json", { cache: "no-store" });
        if (!response.ok) throw new Error("题库目录读取失败。");
        const staticIndex = await response.json() as IndexData;
        if (cancelled) return;
        const { overrides, error } = await listExamContentOverrides(exam);
        if (cancelled) return;
        if (error || !overrides.length) {
          setIndex(staticIndex);
          return;
        }
        const byId = new Map(overrides.map((item) => [item.bank_id, item]));
        const knownIds = new Set(staticIndex.entries.map((entry) => entry.id));
        const editedEntries = staticIndex.entries.flatMap((entry) => {
          const saved = byId.get(entry.id);
          if (saved?.is_deleted) return [];
          const content = saved?.bank_data as Record<string, unknown> | null;
          if (!content) return [entry];
          return [{
            ...entry,
            title: typeof content.title === "string" ? content.title : entry.title,
            category: typeof content.category === "string" ? content.category : entry.category,
            questionCount: typeof content.questionCount === "number" ? content.questionCount : countQuestions(content) || entry.questionCount,
            answerCount: typeof content.answerCount === "number" ? content.answerCount : entry.answerCount,
            reviewCount: typeof content.reviewCount === "number" ? content.reviewCount : entry.reviewCount,
            source: typeof content.source === "string" ? content.source : entry.source,
          }];
        });
        const addedEntries = overrides.flatMap((saved) => {
          const content = saved.bank_data as Record<string, unknown> | null;
          if (knownIds.has(saved.bank_id) || saved.is_deleted || !content) return [];
          const kind = content.kind === "paper" ? "paper" : "practice";
          return [{
            id: saved.bank_id,
            title: typeof content.title === "string" ? content.title : saved.title || saved.bank_id,
            category: typeof content.category === "string" ? content.category : saved.category,
            kind,
            year: typeof content.year === "string" || typeof content.year === "number" ? String(content.year) : undefined,
            subject: typeof content.subject === "string" ? content.subject : "",
            questionCount: typeof content.questionCount === "number" ? content.questionCount : countQuestions(content),
            answerCount: typeof content.answerCount === "number" ? content.answerCount : 0,
            reviewCount: typeof content.reviewCount === "number" ? content.reviewCount : 0,
            source: typeof content.source === "string" ? content.source : saved.source,
            href: "/exam-practice/" + exam + "/" + encodeURIComponent(saved.bank_id),
            dataPath: "",
          }];
        });
        setIndex({
          ...staticIndex,
          entries: [...editedEntries, ...addedEntries],
        });
      } catch {
        if (!cancelled) setError("题库目录暂时无法载入，请刷新页面重试。");
      }
    }
    void loadIndex();
    return () => { cancelled = true; };
  }, [exam]);

  const practiceEntries = index?.entries.filter((entry) => entry.kind === "practice") || [];
  const paperEntries = index?.entries.filter((entry) => entry.kind === "paper") || [];
  const categories = useMemo(() => [...new Set(practiceEntries.map((entry) => entry.category).filter((value): value is string => Boolean(value)))], [index]);
  const groupedPapers = useMemo(() => {
    const papers = paperEntries;
    return Object.entries(papers.reduce<Record<string, Entry[]>>((groups, item) => {
      const year = item.year || "未标年份";
      (groups[year] ||= []).push(item);
      return groups;
    }, {})).sort(([a], [b]) => b.localeCompare(a));
  }, [index]);
  const info = labels[exam];
  const knowledgeItems = [{ title: `${info.vocab} 词汇`, description: "词频统计与词汇复习", href: `/vocabulary/books?level=${encodeURIComponent(info.vocab)}`, meta: "核心词汇" }];

  if (error) return <section className="senior-high-page"><div className="senior-high-alert">{error}</div></section>;
  if (!index) return <section className="senior-high-page"><div className="senior-high-loading">正在载入题库目录…</div></section>;

  return <section className="senior-high-page">
    <header className="senior-high-hero"><div><div className="senior-high-eyebrow">{exam.toUpperCase()} · ENGLISH</div><h1>{info.title}</h1><p>{info.subtitle}</p></div><div className="senior-high-stats"><strong>{index.entries.reduce((sum, item) => sum + item.questionCount, 0).toLocaleString()}</strong><span>已整理题目</span><strong>{index.entries.reduce((sum, item) => sum + (item.answerCount ?? item.questionCount), 0).toLocaleString()}</strong><span>有答案题目</span></div></header>
    <nav aria-label="题库分类" className="senior-high-entry-tabs">
      <button className={tab === "knowledge" ? "selected" : ""} onClick={() => setTab("knowledge")} type="button">知识点<small>词汇</small></button>
      <button className={tab === "practice" ? "selected" : ""} onClick={() => setTab("practice")} type="button">题型训练<small>{categories.length} 类</small></button>
      <button className={tab === "papers" ? "selected" : ""} onClick={() => setTab("papers")} type="button">历年试卷<small>{exam === "postgraduate" ? paperEntries.length : "—"}</small></button>
    </nav>
    {tab === "knowledge" ? <div className="senior-high-section"><div className="senior-high-card-grid">{knowledgeItems.map((item) => <Link className="senior-high-topic-card" href={item.href} key={item.title}><strong>{item.meta}</strong><span>{item.title}</span><small>{item.description}</small></Link>)}</div></div> : null}
    {tab === "practice" ? <div className="senior-high-section"><p className="senior-high-muted">{exam === "gmat" ? "按题型选择一组练习；作答记录保存在当前浏览器，提交后显示答案与解析。" : "按题型选择一组练习；作答记录保存在当前浏览器，提交后显示答案与解析。标注“复核”的题目存在 OCR、图表或答案解释缺口。"}</p>{exam === "postgraduate" && practiceEntries.some((item) => item.groupCount) ? <div className="exam-prep-review-note">1980–2020 年题目按原卷题型和年度题组整理；提交后显示该年答案资料。早年文本与版面尚未逐年人工抽检，题组输入用于记录答案，不做自动判分。</div> : null}{practiceEntries.length ? <div className="senior-high-practice-family-grid">{practiceEntries.map((item) => <Link className="senior-high-practice-family-card" href={item.href} key={item.id}><strong>{item.category || item.title}</strong><span>{item.groupCount ? `${item.groupCount} 个年度题组 · 约 ${item.questionCount.toLocaleString()} 道题` : `${item.questionCount.toLocaleString()} 题 · ${item.answerCount ?? item.questionCount} 题有答案`}</span><small>{exam === "gmat" ? "提交后可查看答案与解析" : item.groupCount ? `${item.referenceGroupCount ?? 0} 组含参考答案资料${item.reviewCount ? ` · ${item.reviewCount} 组待复核` : ""}` : `${item.reviewCount ? `${item.reviewCount} 题待复核 · ` : ""}来源：${item.source || "历年真题"}`}</small></Link>)}</div> : <div className="senior-high-empty">考研题型训练正在按历年真题来源整理；当前已完成的 2020–2026 英语一、英语二完整卷可在“历年试卷”中练习。</div>}</div> : null}
    {tab === "papers" ? <div className="senior-high-section">
      {paperEntries.length ? groupedPapers.map(([year, items]) => <div className="senior-high-group" key={year}><h3>{year} 年</h3><div className="senior-high-paper-grid">{items.map((item) => <Link className="senior-high-paper-card" href={item.href} key={item.id}><strong>{item.subject || item.category || "试卷"}</strong><span>{item.title}</span><small>{item.questionCount} 题 · 答案与解析可查看{item.reviewCount ? ` · ${item.reviewCount} 项待复核` : ""}</small></Link>)}</div></div>) : <div className="senior-high-empty">{exam === "gmat" ? "目前本地已整理的是 GMAT Official Guide 2024–2025 分题型练习，尚未找到可逐套核对的历年完整试卷；不会把题型练习标成历年真题。" : "当前考试暂无已发布试卷。"}</div>}
    </div> : null}
  </section>;
}
