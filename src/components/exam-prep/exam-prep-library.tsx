"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ExamPagePresentation } from "@/components/exam-page-presentation";

type ExamId = "postgraduate" | "gre" | "gmat";
type Entry = { id: string; title: string; category?: string; kind: string; year?: string; subject?: string; questionCount: number; answerCount?: number; reviewCount?: number; href: string; dataPath?: string; source?: string; unitLabel?: string; groupCount?: number; referenceGroupCount?: number };
type IndexData = { entries: Entry[] };
type Tab = "knowledge" | "practice" | "papers";

function getInitialTab(exam: ExamId, requested: string | null): Tab {
  if (exam === "gre") return "practice";
  if (exam === "postgraduate") return requested === "practice" ? "practice" : "papers";
  return requested === "papers" || requested === "knowledge" || requested === "practice" ? requested : "practice";
}

function countBankQuestions(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countBankQuestions(item), 0);
  return Object.entries(value as Record<string, unknown>).reduce((sum, [key, child]) => {
    if (key === "questions" && Array.isArray(child)) return sum + child.length;
    return sum + countBankQuestions(child);
  }, 0);
}

const labels: Record<ExamId, { vocab: string }> = {
  postgraduate: { vocab: "考研" },
  gre: { vocab: "GRE" },
  gmat: { vocab: "GMAT" },
};

export function ExamPrepLibrary({ exam }: { exam: ExamId }) {
  const search = useSearchParams();
  const requested = search.get("entry");
  const tab = getInitialTab(exam, requested);
  const [index, setIndex] = useState<IndexData | null>(null);
  const [error, setError] = useState("");
  const [selectedPracticeCategory, setSelectedPracticeCategory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const response = await fetch(`/exam-prep/${exam}/index.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const staticIndex = await response.json() as IndexData;
        if (cancelled) return;
        const { data: rows, error: bankError } = await supabase
          .from("exam_prep_banks")
          .select("bank_id,title,category,source,bank_data,is_deleted")
          .eq("exam", exam)
          .eq("status", "published");
        if (cancelled) return;
        const saved = new Map((bankError ? [] : rows || []).map((row) => [row.bank_id, row]));
        const knownIds = new Set(staticIndex.entries.map((entry) => entry.id));
        const entries = staticIndex.entries.flatMap((entry) => {
          const row = saved.get(entry.id);
          if (row?.is_deleted) return [];
          const bank = row?.bank_data && typeof row.bank_data === "object" ? row.bank_data as Record<string, unknown> : null;
          if (!bank) return [entry];
          const questions = Array.isArray(bank.questions) ? bank.questions : [];
          return [{
            ...entry,
            title: typeof bank.title === "string" ? bank.title : row?.title || entry.title,
            category: typeof bank.category === "string" ? bank.category : row?.category || entry.category,
            kind: typeof bank.kind === "string" ? bank.kind : entry.kind,
            year: typeof bank.year === "string" || typeof bank.year === "number" ? String(bank.year) : entry.year,
            subject: typeof bank.subject === "string" ? bank.subject : entry.subject,
            questionCount: typeof bank.questionCount === "number" ? bank.questionCount : countBankQuestions(bank),
            answerCount: typeof bank.answerCount === "number" ? bank.answerCount : questions.filter((question) => question && typeof question === "object" && Boolean((question as { answer?: unknown }).answer)).length,
            reviewCount: typeof bank.reviewCount === "number" ? bank.reviewCount : questions.filter((question) => question && typeof question === "object" && Boolean((question as { reviewRequired?: unknown }).reviewRequired)).length,
            source: typeof bank.source === "string" ? bank.source : row?.source || entry.source,
          }];
        });
        const additions = (bankError ? [] : rows || []).flatMap((row) => {
          const bank = row.bank_data && typeof row.bank_data === "object" ? row.bank_data as Record<string, unknown> : null;
          if (knownIds.has(row.bank_id) || row.is_deleted || !bank) return [];
          return [{
            id: row.bank_id,
            title: typeof bank.title === "string" ? bank.title : row.title || row.bank_id,
            category: typeof bank.category === "string" ? bank.category : row.category || "",
            kind: typeof bank.kind === "string" ? bank.kind : "practice",
            year: typeof bank.year === "string" || typeof bank.year === "number" ? String(bank.year) : undefined,
            subject: typeof bank.subject === "string" ? bank.subject : undefined,
            questionCount: typeof bank.questionCount === "number" ? bank.questionCount : countBankQuestions(bank),
            answerCount: typeof bank.answerCount === "number" ? bank.answerCount : 0,
            reviewCount: typeof bank.reviewCount === "number" ? bank.reviewCount : 0,
            source: typeof bank.source === "string" ? bank.source : row.source,
            href: `/exam-practice/${exam}/${encodeURIComponent(row.bank_id)}`,
          }];
        });
        setIndex({ ...staticIndex, entries: [...entries, ...additions] });
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
    return [...groups].map(([category, entries]) => ({ category, entries }));
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
    <ExamPagePresentation exam={exam} />
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
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="senior-high-practice-family-grid">
              {practiceEntries.map((item) => (
                <Link className="senior-high-practice-family-card" href={item.href} key={item.id}>
                  <strong>{item.category || item.title}</strong>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="senior-high-empty">
            题型训练内容正在整理。
          </div>
        )}
      </div>
    ) : null}
    {tab === "papers" ? <div className="senior-high-section">
      {exam === "postgraduate" ? groupedPapers.map(([year, items]) => <div className="senior-high-group" key={year}><h3>{year} 年</h3><div className="senior-high-paper-grid">{items.map((item) => <Link className="senior-high-paper-card" href={item.href} key={item.id}><strong>{item.subject}</strong><span>{item.title}</span></Link>)}</div></div>) : <div className="senior-high-empty">历年真题正在整理。</div>}
    </div> : null}
  </section>;
}
