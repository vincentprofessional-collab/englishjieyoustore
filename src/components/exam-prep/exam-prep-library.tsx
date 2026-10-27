"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ExamId = "postgraduate" | "gre" | "gmat";
type Entry = { id: string; title: string; category?: string; kind: string; year?: string; subject?: string; questionCount: number; answerCount?: number; reviewCount?: number; href: string; source?: string; unitLabel?: string; groupCount?: number; referenceGroupCount?: number };
type IndexData = { entries: Entry[] };
type Tab = "knowledge" | "practice" | "papers";

function getInitialTab(exam: ExamId, requested: string | null): Tab {
  if (exam === "gre") return "practice";
  if (exam === "postgraduate") return requested === "practice" ? "practice" : "papers";
  return requested === "papers" || requested === "knowledge" || requested === "practice" ? requested : "practice";
}

const labels: Record<ExamId, { title: string; subtitle: string; vocab: string }> = {
  postgraduate: { title: "考研英语学习中心", subtitle: "按历年完整试卷或题型练习；提交后查看答案与解析。", vocab: "考研" },
  gre: { title: "GRE 学习中心", subtitle: "按填空、阅读理解和逻辑推理练习；提交后查看答案与来源解析。", vocab: "GRE" },
  gmat: { title: "GMAT 学习中心", subtitle: "按题型进行专项练习；提交后查看答案与解析。", vocab: "GMAT" },
};

export function ExamPrepLibrary({ exam }: { exam: ExamId }) {
  const search = useSearchParams();
  const requested = search.get("entry");
  const [tab, setTab] = useState<Tab>(() => getInitialTab(exam, requested));
  const [index, setIndex] = useState<IndexData | null>(null);
  const [error, setError] = useState("");
  const [selectedPracticeCategory, setSelectedPracticeCategory] = useState<string | null>(null);

  useEffect(() => {
    setTab(getInitialTab(exam, requested));
  }, [exam, requested]);
  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const response = await fetch(`/exam-prep/${exam}/index.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const staticIndex = await response.json() as IndexData;
        if (cancelled) return;
        setIndex(staticIndex);
        if (exam !== "gmat") return;

        const { data: rows, error: bankError } = await supabase
          .from("exam_prep_banks")
          .select("bank_id,bank_data")
          .eq("exam", "gmat")
          .eq("status", "published");
        if (cancelled || bankError || !rows?.length) return;

        const published = new Map(rows.map((row) => [row.bank_id, row.bank_data as {
          title?: string; category?: string; questions?: { answer?: string | null; reviewRequired?: boolean }[];
        }]));
        setIndex((current) => current ? {
          ...current,
          entries: current.entries.map((entry) => {
            const bank = published.get(entry.id);
            if (!bank?.questions) return entry;
            return {
              ...entry,
              title: bank.title || entry.title,
              category: bank.category || entry.category,
          questionCount: bank.questions.filter((question) => !question.reviewRequired).length,
          answerCount: bank.questions.filter((question) => !question.reviewRequired && Boolean(question.answer)).length,
          reviewCount: 0,
            };
          }),
        } : current);
      } catch {
        if (!cancelled) setError("题库目录暂时无法载入，请刷新页面重试。");
      }
    }
    void loadIndex();
    return () => { cancelled = true; };
  }, [exam]);

  const practiceEntries = index?.entries.filter((entry) => entry.kind === "practice") || [];
  const paperEntries = index?.entries.filter((entry) => entry.kind === "paper") || [];
  const practiceGroups = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    for (const entry of index?.entries.filter((item) => item.kind === "practice") || []) {
      const category = entry.category || entry.title;
      const entries = groups.get(category) || [];
      entries.push(entry);
      groups.set(category, entries);
    }
    return [...groups].map(([category, entries]) => ({
      category,
      entries,
      questionCount: entries.reduce((sum, entry) => sum + entry.questionCount, 0),
    }));
  }, [index]);
  const selectedPracticeGroup = practiceGroups.find((group) => group.category === selectedPracticeCategory);
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
    <nav
      aria-label="题库分类"
      className={`senior-high-entry-tabs${exam === "gre" ? " one-tab" : exam === "postgraduate" ? " two-tabs" : ""}`}
    >
      {exam !== "gre" && exam !== "postgraduate" ? (
        <button className={tab === "knowledge" ? "selected" : ""} onClick={() => setTab("knowledge")} type="button">
          知识点<small>词汇</small>
        </button>
      ) : null}
      <button className={tab === "practice" ? "selected" : ""} onClick={() => setTab("practice")} type="button">
        题型训练<small>{practiceGroups.length} 类</small>
      </button>
      {exam !== "gre" ? (
        <button className={tab === "papers" ? "selected" : ""} onClick={() => setTab("papers")} type="button">
          {exam === "postgraduate" ? "历年真题" : "历年试卷"}
          <small>{exam === "postgraduate" ? paperEntries.length : "—"}</small>
        </button>
      ) : null}
    </nav>
    {tab === "knowledge" ? (
      <div className="senior-high-section">
        <div className="senior-high-card-grid">
          {knowledgeItems.map((item) => (
            <Link className="senior-high-topic-card" href={item.href} key={item.title}>
              <strong>{item.meta}</strong><span>{item.title}</span><small>{item.description}</small>
            </Link>
          ))}
        </div>
      </div>
    ) : null}
    {tab === "practice" ? (
      <div className="senior-high-section">
        <p className="senior-high-muted">
          {exam === "gmat"
            ? "按题型选择一组练习；作答记录保存在当前浏览器，提交后显示答案与解析。"
            : "按题型选择一组练习；作答记录保存在当前浏览器，提交后显示答案与解析。标注“复核”的题目存在 OCR、图表或答案解释缺口。"}
        </p>
        {exam === "postgraduate" && practiceEntries.some((item) => item.groupCount) ? (
          <div className="exam-prep-review-note">
            1980–2020 年题目按原卷题型和年度题组整理；提交后显示该年答案资料。早年文本与版面尚未逐年人工抽检，题组输入用于记录答案，不做自动判分。
          </div>
        ) : null}
        {practiceEntries.length ? (
          exam === "gre" ? (
            selectedPracticeGroup ? (
              <div>
                <button className="senior-high-back" onClick={() => setSelectedPracticeCategory(null)} type="button">
                  ← 返回题型
                </button>
                <h2>{selectedPracticeGroup.category}</h2>
                <div className="senior-high-practice-family-grid">
                  {selectedPracticeGroup.entries.map((item) => (
                    <Link className="senior-high-practice-family-card" href={item.href} key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.questionCount.toLocaleString()} 题 · {item.answerCount ?? item.questionCount} 题有答案</span>
                      <small>{item.reviewCount ? `${item.reviewCount} 题待复核 · ` : ""}来源：{item.source || "未标注"}</small>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="senior-high-practice-family-grid">
                {practiceGroups.map((group) => (
                  <button
                    className="senior-high-practice-family-card"
                    key={group.category}
                    onClick={() => setSelectedPracticeCategory(group.category)}
                    type="button"
                  >
                    <strong>{group.category}</strong>
                    <span>{group.entries.length} 个来源题组 · {group.questionCount.toLocaleString()} 题合计</span>
                    <small>点击查看该题型下的题组</small>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="senior-high-practice-family-grid">
              {practiceEntries.map((item) => (
                <Link className="senior-high-practice-family-card" href={item.href} key={item.id}>
                  <strong>{item.category || item.title}</strong>
                  <span>
                    {item.groupCount
                      ? `${item.groupCount} 个年度题组 · 约 ${item.questionCount.toLocaleString()} 道题`
                      : `${item.questionCount.toLocaleString()} 题 · ${item.answerCount ?? item.questionCount} 题有答案`}
                  </span>
                  <small>
                    {exam === "gmat"
                      ? "提交后可查看答案与解析"
                      : item.groupCount
                        ? `${item.referenceGroupCount ?? 0} 组含参考答案资料${item.reviewCount ? ` · ${item.reviewCount} 组待复核` : ""}`
                        : `${item.reviewCount ? `${item.reviewCount} 题待复核 · ` : ""}来源：${item.source || "历年真题"}`}
                  </small>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="senior-high-empty">
            考研题型训练正在按历年真题来源整理；当前已完成的 2020–2026 英语一、英语二完整卷可在“历年试卷”中练习。
          </div>
        )}
      </div>
    ) : null}
    {tab === "papers" ? <div className="senior-high-section">
      {exam === "postgraduate" ? groupedPapers.map(([year, items]) => <div className="senior-high-group" key={year}><h3>{year} 年</h3><div className="senior-high-paper-grid">{items.map((item) => <Link className="senior-high-paper-card" href={item.href} key={item.id}><strong>{item.subject}</strong><span>{item.title}</span><small>{item.questionCount} 题 · 答案与解析可查看{item.reviewCount ? ` · ${item.reviewCount} 项待复核` : ""}</small></Link>)}</div></div>) : <div className="senior-high-empty">{exam === "gmat" ? "目前本地已整理的是 GMAT Official Guide 2024–2025 分题型练习，尚未找到可逐套核对的历年完整试卷；不会把题型练习标成历年真题。" : "当前整理结果按题型归档。综合练习资料仍保留在本地来源清单中，未作为完整真题试卷发布。"}</div>}
    </div> : null}
  </section>;
}
