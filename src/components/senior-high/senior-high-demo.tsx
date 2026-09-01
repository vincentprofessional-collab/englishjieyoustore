"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SENIOR_HIGH_CATALOG_URL, seniorHighCategoryLabel } from "@/lib/senior-high/catalog";
import { applySeniorHighCatalogOverrides, loadSeniorHighQuestionOverrides } from "@/lib/senior-high/question-overrides";
import type { SeniorHighCatalog, SeniorHighItem, SeniorHighPaper } from "@/lib/senior-high/types";

type Entry = "knowledge" | "practice" | "papers";
type PracticeSourceGroup = { key: string; title: string; items: SeniorHighItem[] };
type Session = { kind: "topic"; topic: string; items: SeniorHighItem[] } | { kind: "practice-group"; category: string; group: PracticeSourceGroup } | { kind: "item"; item: SeniorHighItem } | { kind: "paper"; paper: SeniorHighPaper };

const ENTRY_LABELS: Record<Entry, string> = {
  knowledge: "知识点",
  practice: "题型训练",
  papers: "历年真题",
};

const KNOWLEDGE_TOPIC_ORDER = ["词汇与短语", "名词", "冠词", "代词", "数词", "形容词和副词", "介词", "构词法", "动词时态和语态", "非谓语动词", "情态动词和虚拟语气", "定语从句", "名词性从句", "状语从句和并列句", "特殊句式", "主谓一致", "听说表达", "综合语法"];
const PRACTICE_CATEGORY_ORDER = ["listening", "reading", "seven_choice", "cloze", "grammar_fill", "error_correction", "writing", "other"];
const SENIOR_HIGH_BLANK_PATTERN = /_{2,}/g;

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s．。、，,：:；;]/g, "");
}

function isCorrect(item: SeniorHighItem, value: string) {
  if (item.category === "writing") return false;
  const blankCount = item.stem.match(SENIOR_HIGH_BLANK_PATTERN)?.length ?? 0;
  if (blankCount > 1) {
    const expectedParts = item.answer.split(/\s*[;；]\s*/);
    const actualParts = value.split(/\s*[;；]\s*/);
    if (expectedParts.length === blankCount && actualParts.length === blankCount) {
      return expectedParts.every((expected, index) => expected.split(/[\/／]/).some((answer) => normalize(answer) === normalize(actualParts[index])));
    }
  }
  const actual = normalize(value);
  return item.answer.split(/[\/／]/).some((answer) => normalize(answer) === actual);
}

function sessionKey(session: Session) {
  if (session.kind === "topic") return `senior-high-attempt:knowledge:${session.topic}`;
  if (session.kind === "practice-group") return `senior-high-attempt:practice:${session.group.key}`;
  return `senior-high-attempt:${session.kind === "item" ? session.item.id : session.paper.id}`;
}

function completionKey(session: Session) {
  if (session.kind === "topic") return `topic:${session.topic}`;
  if (session.kind === "practice-group") return practiceCompletionKey(session.group);
  return session.kind === "item" ? session.item.id : session.paper.id;
}

function sourceLabel(item: SeniorHighItem) {
  return `${item.source_relpath}${item.source_section ? ` · ${item.source_section}` : ""}`;
}

function practiceCompletionKey(group: PracticeSourceGroup) {
  return `practice:${group.key}`;
}

function practiceSourceKey(item: SeniorHighItem) {
  return [item.category, item.source_relpath, item.source_section ?? "", item.title].join("|");
}

function practiceSourceGroups(items: SeniorHighItem[], category: string): PracticeSourceGroup[] {
  const groups = new Map<string, PracticeSourceGroup>();
  for (const item of items) {
    if (item.category !== category) continue;
    const key = practiceSourceKey(item);
    const group = groups.get(key) ?? { key, title: item.title, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title, "zh-CN") || a.items[0].source_relpath.localeCompare(b.items[0].source_relpath, "zh-CN"));
}

function practiceCategories(items: SeniorHighItem[]) {
  return [...new Set(items.map((item) => item.category))].sort((a, b) => {
    const aIndex = PRACTICE_CATEGORY_ORDER.indexOf(a);
    const bIndex = PRACTICE_CATEGORY_ORDER.indexOf(b);
    return (aIndex < 0 ? PRACTICE_CATEGORY_ORDER.length : aIndex) - (bIndex < 0 ? PRACTICE_CATEGORY_ORDER.length : bIndex) || seniorHighCategoryLabel(a).localeCompare(seniorHighCategoryLabel(b), "zh-CN");
  });
}

function seniorHighInlineAnswerParts(value: string, count: number) {
  if (count <= 1) return [value];
  const parts = value.split(/\s*[;；]\s*/);
  return Array.from({ length: count }, (_, index) => parts[index] ?? "");
}

function SeniorHighInlineStem({ item, value, onAnswer }: { item: SeniorHighItem; value: string; onAnswer: (value: string) => void }) {
  const blanks = item.stem.match(SENIOR_HIGH_BLANK_PATTERN) ?? [];
  const parts = item.stem.split(SENIOR_HIGH_BLANK_PATTERN);
  const values = seniorHighInlineAnswerParts(value, Math.max(1, blanks.length));
  const update = (index: number, nextValue: string) => {
    const nextValues = [...values];
    nextValues[index] = nextValue;
    onAnswer(nextValues.join("; "));
  };
  if (!blanks.length) return <><span>{item.stem}</span><input aria-label={`第 ${item.question_number} 题答案`} autoComplete="off" className="senior-high-inline-answer" onChange={(event) => update(0, event.target.value)} spellCheck={false} value={values[0]} /></>;
  return parts.flatMap((part, index) => [
    <span key={`stem-${index}`}>{part}</span>,
    index < blanks.length ? <input aria-label={`第 ${item.question_number} 题第 ${index + 1} 空`} autoComplete="off" className="senior-high-inline-answer" key={`blank-${index}`} onChange={(event) => update(index, event.target.value)} spellCheck={false} value={values[index]} /> : null,
  ]) as ReactNode;
}

export function SeniorHighDemo() {
  const [catalog, setCatalog] = useState<SeniorHighCatalog | null>(null);
  const [entry, setEntry] = useState<Entry>("knowledge");
  const [selectedPracticeCategory, setSelectedPracticeCategory] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      fetch(SENIOR_HIGH_CATALOG_URL).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<SeniorHighCatalog>;
      }),
      loadSeniorHighQuestionOverrides(),
    ])
      .then(([loadedCatalog, overrides]) => setCatalog(applySeniorHighCatalogOverrides(loadedCatalog, overrides)))
      .catch(() => setError("高考英语资料暂时无法载入，请稍后刷新重试。"));
    try {
      const saved = JSON.parse(window.localStorage.getItem("senior-high-completed") || "{}");
      if (saved && typeof saved === "object") setCompleted(saved as Record<string, string>);
    } catch {
      setCompleted({});
    }
  }, []);

  const questions = useMemo(() => {
    if (!session) return [];
    if (session.kind === "topic") return session.items;
    if (session.kind === "practice-group") return session.group.items;
    return session.kind === "item" ? [session.item] : session.paper.questions.filter((item) => item.active);
  }, [session]);

  const openEntry = (nextEntry: Entry) => {
    setEntry(nextEntry);
    setSelectedPracticeCategory(null);
    setSession(null);
    setAnswers({});
    setSubmitted(false);
    setExpanded({});
  };

  const start = (nextSession: Session) => {
    setSession(nextSession);
    setSubmitted(false);
    setExpanded({});
    try {
      const saved = JSON.parse(window.localStorage.getItem(sessionKey(nextSession)) || "null") as { answers?: Record<string, string>; completedAt?: string } | null;
      setAnswers(saved?.answers ?? {});
      if (saved?.completedAt) setCompleted((current) => ({ ...current, [completionKey(nextSession)]: saved.completedAt || "" }));
    } catch {
      setAnswers({});
    }
  };

  const setAnswer = (id: string, value: string) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSubmitted(false);
  };

  const submit = () => {
    if (!session) return;
    const completedAt = new Date().toISOString();
    window.localStorage.setItem(sessionKey(session), JSON.stringify({ answers, completedAt }));
    setCompleted((current) => ({ ...current, [completionKey(session)]: completedAt }));
    setSubmitted(true);
  };

  if (error) return <section className="senior-high-page"><div className="senior-high-alert">{error}</div></section>;
  if (!catalog) return <section className="senior-high-page"><div className="senior-high-loading">正在载入高考英语资料…</div></section>;

  if (session) {
    const title = session.kind === "topic" ? session.topic : session.kind === "practice-group" ? session.group.title : session.kind === "item" ? session.item.title : session.paper.title;
    const source = session.kind === "topic" ? `知识点主题 · ${session.topic}` : session.kind === "practice-group" ? `题型训练 · ${sourceLabel(session.group.items[0])}` : session.kind === "item" ? sourceLabel(session.item) : session.paper.source_relpath;
    const autoGradable = questions.filter((item) => item.category !== "writing");
    const correctCount = submitted ? autoGradable.filter((item) => isCorrect(item, answers[item.id] || "")).length : 0;
    const answeredCount = questions.filter((item) => Boolean(answers[item.id]?.trim())).length;
    return (
      <section className="senior-high-page senior-high-session">
        <div className="senior-high-session-toolbar">
          <button className="senior-high-back" onClick={() => { setSession(null); if (session.kind === "practice-group") setSelectedPracticeCategory(session.category); }} type="button">← 返回选择</button>
          <div><span>{session.kind === "paper" ? "完整试卷" : session.kind === "topic" ? "知识点" : session.kind === "practice-group" ? "题型训练" : ENTRY_LABELS[entry]}</span><strong>{title}</strong></div>
          <span>{answeredCount}/{questions.length} 已作答</span>
        </div>
        <div className="senior-high-source-line">来源：{source}</div>
        {submitted ? <div className="senior-high-result"><strong>{correctCount}/{autoGradable.length}</strong> 自动判分正确{questions.some((item) => item.category === "writing") ? "；写作题请人工评阅" : ""}</div> : null}
        <div className="senior-high-question-list">
          {questions.map((item, index) => {
            const value = answers[item.id] || "";
            const correct = submitted && item.category !== "writing" && isCorrect(item, value);
            return <article className="senior-high-question-card" key={item.id}>
              <div className="senior-high-question-meta">
                <span>第 {index + 1} 题</span>
                {item.source_question_number && item.source_question_number !== index + 1 ? <small>原卷题号 {item.source_question_number}</small> : null}
                <small>{seniorHighCategoryLabel(item.category)}</small>
              </div>
              <p className="senior-high-question-stem">{item.options.length ? item.stem : item.category === "writing" ? item.stem : <SeniorHighInlineStem item={item} onAnswer={(nextValue) => setAnswer(item.id, nextValue)} value={value} />}</p>
              {item.options.length ? <div className="senior-high-options">{item.options.map((option) => <button className={value === option.letter ? "selected" : ""} key={option.letter} onClick={() => setAnswer(item.id, option.letter)} type="button"><b>{option.letter}.</b><span>{option.text}</span></button>)}</div> : item.category === "writing" ? <textarea aria-label={`第 ${index + 1} 题答案`} className="senior-high-answer-input" onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="请在这里完成写作…" rows={8} value={value} /> : null}
              {submitted ? <div className={`senior-high-feedback ${item.category === "writing" ? "manual" : correct ? "correct" : "incorrect"}`}><span>{item.category === "writing" ? "已提交，需人工评分" : correct ? "✓ 正确" : "✕ 未答对"}</span><strong>答案：{item.answer}</strong>{item.analysis ? <button onClick={() => setExpanded((current) => ({ ...current, [item.id]: !current[item.id] }))} type="button">{expanded[item.id] ? "收起解析" : "查看解析"}</button> : <small>暂无解析</small>}{expanded[item.id] && item.analysis ? <div className="senior-high-analysis"><p>{item.analysis}</p><small>来源：{sourceLabel(item)}</small></div> : null}</div> : null}
            </article>;
          })}
        </div>
        <div className="senior-high-submit-row"><button className="senior-high-submit" onClick={submit} type="button">{submitted ? "重新提交" : "提交并查看答案"}</button></div>
      </section>
    );
  }

  const grouped = (items: SeniorHighItem[], byKnowledgeTopic = false) => Object.entries(items.reduce<Record<string, SeniorHighItem[]>>((groups, item) => { const key = byKnowledgeTopic ? item.knowledge_topic || "综合语法" : item.category; (groups[key] ||= []).push(item); return groups; }, {})).map(([key, groupedItems]) => [key, [...groupedItems].sort((a, b) => a.title.localeCompare(b.title, "zh-CN") || (a.source_question_number ?? a.question_number) - (b.source_question_number ?? b.question_number))] as [string, SeniorHighItem[]]).sort(([a], [b]) => { if (!byKnowledgeTopic) return a.localeCompare(b, "zh-CN"); const aIndex = KNOWLEDGE_TOPIC_ORDER.indexOf(a); const bIndex = KNOWLEDGE_TOPIC_ORDER.indexOf(b); return (aIndex < 0 ? KNOWLEDGE_TOPIC_ORDER.length : aIndex) - (bIndex < 0 ? KNOWLEDGE_TOPIC_ORDER.length : bIndex) || a.localeCompare(b, "zh-CN"); });
  const knowledgeGroups = grouped(catalog.knowledge, true);
  const practiceCategoryList = practiceCategories(catalog.practice);
  const selectedPracticeGroups = selectedPracticeCategory ? practiceSourceGroups(catalog.practice, selectedPracticeCategory) : [];
  const paperYears = Object.entries(catalog.papers.reduce<Record<string, SeniorHighPaper[]>>((groups, paper) => { (groups[paper.year] ||= []).push(paper); return groups; }, {})).sort(([a], [b]) => Number(b) - Number(a));
  return <section className="senior-high-page">
    <div className="senior-high-hero"><div><div className="senior-high-eyebrow">SENIOR HIGH · ENGLISH</div><h1>高考英语学习中心</h1><p>按知识点、题型训练和完整历年真题组织资料。完整试卷只保留在真题入口，提交后显示答案，有解析则同步显示。</p></div><div className="senior-high-stats"><strong>{catalog.knowledge.length + catalog.practice.length}</strong><span>已发布训练题</span><strong>{catalog.papers.length}</strong><span>已通过审核的完整卷</span></div></div>
    <nav className="senior-high-entry-tabs" aria-label="高考英语资料入口">{(Object.keys(ENTRY_LABELS) as Entry[]).map((key) => <button className={entry === key ? "selected" : ""} key={key} onClick={() => openEntry(key)} type="button">{ENTRY_LABELS[key]}<small>{key === "knowledge" ? catalog.knowledge.length : key === "practice" ? catalog.practice.length : catalog.papers.length}</small></button>)}</nav>
    {entry === "knowledge" ? <div className="senior-high-section"><h2>知识点</h2><p className="senior-high-muted">先按语法主题选择，再进入该主题的连续题目；有答案即可学习，解析有则显示。</p><div className="senior-high-topic-grid">{knowledgeGroups.map(([topic, items]) => { const completionId = `topic:${topic}`; return <button className="senior-high-topic-card" key={topic} onClick={() => start({ kind: "topic", topic, items })} type="button"><strong>{topic}</strong><span>{items.length} 题 · {completed[completionId] ? "已完成" : "未完成"}</span></button>; })}</div></div> : null}
    {entry === "practice" ? <div className="senior-high-section">{selectedPracticeCategory === null ? <><h2>题型训练</h2><p className="senior-high-muted">先按题型大类选择，再按真实来源选择题组；题号在题组内连续，答案即可作答，解析为可选内容。</p><div className="senior-high-practice-family-grid">{practiceCategoryList.map((category) => { const groups = practiceSourceGroups(catalog.practice, category); const total = groups.reduce((sum, group) => sum + group.items.length, 0); const completedGroups = groups.filter((group) => completed[practiceCompletionKey(group)]).length; return <button className="senior-high-practice-family-card" key={category} onClick={() => setSelectedPracticeCategory(category)} type="button"><strong>{seniorHighCategoryLabel(category)}</strong><span>{total} 题 · {groups.length} 组</span><small>已完成 {completedGroups} 组 · 未完成 {groups.length - completedGroups} 组</small></button>; })}</div></> : <><button className="senior-high-back" onClick={() => setSelectedPracticeCategory(null)} type="button">← 返回题型训练</button><h2>{seniorHighCategoryLabel(selectedPracticeCategory)}</h2><p className="senior-high-muted">按真实来源选择一组练习；进入后题号从第 1 题连续排列，提交后显示答案。</p><div className="senior-high-practice-source-grid">{selectedPracticeGroups.map((group) => { const first = group.items[0]; return <button className="senior-high-library-card" key={group.key} onClick={() => start({ kind: "practice-group", category: selectedPracticeCategory, group })} type="button"><strong>{group.title}</strong><span>{group.items.length} 题 · {completed[practiceCompletionKey(group)] ? "已完成" : "未完成"}</span><small>来源：{sourceLabel(first)}</small></button>; })}</div></>}</div> : null}
    {entry === "papers" ? <div className="senior-high-section"><h2>历年真题</h2><p className="senior-high-muted">完整卷按年份、地区和卷型排列；待审核源只在后台审计清单中，不会混入训练题。</p>{paperYears.length ? paperYears.map(([year, papers]) => <div className="senior-high-group" key={year}><h3>{year} 年</h3><div className="senior-high-paper-grid">{papers.map((paper) => <button className="senior-high-paper-card" key={paper.id} onClick={() => start({ kind: "paper", paper })} type="button"><strong>{paper.region} · {paper.paper}</strong><span>{paper.question_count} 题 · {completed[paper.id] ? "已完成" : "开始整卷练习"}</span><small>原始来源：{paper.source_relpath}</small></button>)}</div></div>) : <div className="senior-high-empty">当前没有通过完整性审核的试卷。审计目录中保留了 {catalog.paper_review_count} 份待审核源，不会被误发布。</div>}</div> : null}
  </section>;
}
