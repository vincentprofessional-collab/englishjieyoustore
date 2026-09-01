"use client";

import { useEffect, useMemo, useState } from "react";
import { JuniorHighPaperWorkbench } from "@/components/junior-high/beijing-paper-workbench";
import { JUNIOR_HIGH_PAPER_CATALOG } from "@/lib/junior-high/paper-catalog";
import type { JuniorHighPaper } from "@/lib/junior-high/paper-types";
import {
  JUNIOR_HIGH_PRACTICE_CATALOG,
  type JuniorHighPracticeCatalogItem,
  type JuniorHighPracticeCategory,
} from "@/lib/junior-high/practice-catalog";
import { applyJuniorHighQuestionOverrides, loadJuniorHighQuestionOverrides } from "@/lib/junior-high/question-overrides";
import {
  JUNIOR_HIGH_PRACTICE_FAMILIES,
  buildJuniorHighSourcePracticeCards,
  canonicalizeJuniorHighQuestionSequence,
  createJuniorHighSourcePracticePaper,
} from "@/lib/junior-high/practice-model.mjs";
import { supabase } from "@/lib/supabase/client";

type Mode = "mock-select" | "mock" | "practice-select" | "source-select" | "practice";
type JuniorHighTab = JuniorHighPracticeCategory | "mock";
type PracticeProgress = { answered: number; completed: boolean; completedAt?: string };
type SourcePracticeCard = ReturnType<typeof buildJuniorHighSourcePracticeCards>[number];
type StoredPracticeAttempt = {
  answers: Record<string, string>;
  writingAnswers: Record<string, string>;
  writingA?: string;
  writingB?: string;
  completedAt?: string;
};

const AVAILABLE_JUNIOR_HIGH_PAPERS = JUNIOR_HIGH_PAPER_CATALOG.filter((paper) => paper.questions.length > 0);

const CATEGORY_LABEL: Record<JuniorHighPracticeCategory, string> = {
  topic: "专项学习",
  type: "题型训练",
};
const TAB_LABEL: Record<JuniorHighTab, string> = {
  topic: "专项学习",
  type: "题型训练",
  mock: "模考真题",
};

const TOPIC_ITEM_ORDER = ["名词", "冠词", "代词", "数词", "形容词和副词", "连词", "构词法", "介词", "情态动词", "动词时态", "被动语态", "非谓语动词", "词汇辨析", "动词短语", "短语辨析", "介词短语", "宾语从句", "定语从句", "状语从句", "名词性从句", "主谓一致", "句子成分和基本句型", "句子种类和特殊句式", "并列复合句", "综合语法"];
function publishableQuestionCount(item: JuniorHighPracticeCatalogItem) {
  return item.publishableQuestionCount ?? 0;
}

function practiceQuestionCount(item: JuniorHighPracticeCatalogItem) {
  return item.category === "type" ? publishableQuestionCount(item) : item.questionCount;
}

function isEligiblePracticeItem(item: JuniorHighPracticeCatalogItem) {
  return publishableQuestionCount(item) > 0;
}

function isEligibleTopicItem(item: JuniorHighPracticeCatalogItem) {
  return item.questionCount >= 20;
}

function categoryItems(category: JuniorHighPracticeCategory) {
  const items = JUNIOR_HIGH_PRACTICE_CATALOG.filter((item) => item.category === category);
  return category === "type" ? items.filter(isEligiblePracticeItem) : items.filter(isEligibleTopicItem);
}

function practiceFamilyForType(questionType: string) {
  return JUNIOR_HIGH_PRACTICE_FAMILIES.find((family) => family.subtypes.includes(questionType));
}

function practiceItemsForFamily(familyId: string) {
  const family = JUNIOR_HIGH_PRACTICE_FAMILIES.find((candidate) => candidate.id === familyId);
  if (!family) return [];
  return family.subtypes
    .map((questionType) => JUNIOR_HIGH_PRACTICE_CATALOG.find((item) => item.category === "type" && item.questionType === questionType && isEligiblePracticeItem(item)))
    .filter((item): item is JuniorHighPracticeCatalogItem => Boolean(item));
}

function mockPaperTitle(paper: JuniorHighPaper) {
  return `${paper.year} ${paper.region}中考试卷`;
}

function mockPaperKey(paper: JuniorHighPaper) {
  return `${paper.year}-${paper.region}-${paper.label}`;
}

function groupedMockPapers() {
  const groups = new Map<number, JuniorHighPaper[]>();
  for (const paper of AVAILABLE_JUNIOR_HIGH_PAPERS) groups.set(paper.year, [...(groups.get(paper.year) ?? []), paper]);
  return [...groups.entries()]
    .map(([year, papers]) => ({ year, papers }))
    .sort((a, b) => b.year - a.year);
}

function practiceAttemptKey(item: JuniorHighPracticeCatalogItem) {
  return `ielts-platform.juniorHighAttempt:practice:${item.id}`;
}

function storedPracticeAttempt(item: JuniorHighPracticeCatalogItem): StoredPracticeAttempt {
  const baseKey = practiceAttemptKey(item);
  const merged: StoredPracticeAttempt = { answers: {}, writingAnswers: {} };
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || key !== baseKey && !key.startsWith(`${baseKey}:group:`)) continue;
    const saved = JSON.parse(window.localStorage.getItem(key) || "null") as { answers?: Record<string, string>; writingAnswers?: Record<string, string>; writingA?: string; writingB?: string; completedAt?: string } | null;
    Object.assign(merged.answers, saved?.answers ?? {});
    Object.assign(merged.writingAnswers, saved?.writingAnswers ?? {});
    if (saved?.writingA) merged.writingA = saved.writingA;
    if (saved?.writingB) merged.writingB = saved.writingB;
    if (saved?.completedAt && (!merged.completedAt || saved.completedAt > merged.completedAt)) merged.completedAt = saved.completedAt;
  }
  return merged;
}

function practiceAnswerIsCorrect(question: JuniorHighPaper["questions"][number], value: string) {
  const normalize = (input: string) => input.trim().toLowerCase().replace(/[．。、)）]/g, "");
  return normalize(value) === normalize(question.answer);
}

function practicePaperUrl(item: JuniorHighPracticeCatalogItem, groupId?: string) {
  const search = new URLSearchParams({ mode: "practice", id: item.id });
  if (groupId) search.set("group", groupId);
  return `/junior-high?${search.toString()}`;
}

function paperForSourceCard(paper: JuniorHighPaper, card: SourcePracticeCard) {
  return createJuniorHighSourcePracticePaper(paper, card) as JuniorHighPaper;
}

export function JuniorHighDemo() {
  const [mode, setMode] = useState<Mode>("practice-select");
  const [practiceCategory, setPracticeCategory] = useState<JuniorHighPracticeCategory>("topic");
  const [practicePaper, setPracticePaper] = useState<JuniorHighPaper | null>(null);
  const [sourcePaper, setSourcePaper] = useState<JuniorHighPaper | null>(null);
  const [mockPaper, setMockPaper] = useState<JuniorHighPaper | null>(null);
  const [practiceSourceItem, setPracticeSourceItem] = useState<JuniorHighPracticeCatalogItem | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState(JUNIOR_HIGH_PRACTICE_FAMILIES[0].id);
  const [practiceLoadingId, setPracticeLoadingId] = useState("");
  const [practiceError, setPracticeError] = useState("");
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [sourceAttempt, setSourceAttempt] = useState<StoredPracticeAttempt>({ answers: {}, writingAnswers: {} });
  const [sourceSelectionFilter, setSourceSelectionFilter] = useState<"all" | "completed" | "incomplete">("all");
  const [practiceProgress, setPracticeProgress] = useState<Record<string, PracticeProgress>>({});

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "admin") { setIsAdmin(true); setAdminUserId(user.id); }
    })();
  }, []);

  useEffect(() => {
    if (mode !== "source-select" || !practiceSourceItem) return;
    try {
      const saved = storedPracticeAttempt(practiceSourceItem);
      setSourceAttempt(saved);
    } catch {
      setSourceAttempt({ answers: {}, writingAnswers: {} });
    }
  }, [mode, practiceSourceItem]);

  useEffect(() => {
    if (mode !== "practice-select") return;
    const progress: Record<string, PracticeProgress> = {};
    for (const item of JUNIOR_HIGH_PRACTICE_CATALOG) {
      try {
        const saved = storedPracticeAttempt(item);
        const answeredQuestions = Object.values(saved?.answers ?? {}).filter((value) => Boolean(value?.trim())).length;
        const answeredWritingTasks = Object.values(saved?.writingAnswers ?? {}).filter((value) => Boolean(value?.trim())).length;
        const legacyWritingAnswers = answeredWritingTasks ? 0 : [saved?.writingA, saved?.writingB].filter((value) => Boolean(value?.trim())).length;
        const answered = answeredQuestions + answeredWritingTasks + legacyWritingAnswers;
        const questionCount = practiceQuestionCount(item);
        progress[item.id] = { answered, completed: questionCount > 0 && answered >= questionCount, completedAt: saved?.completedAt };
      } catch {
        progress[item.id] = { answered: 0, completed: false };
      }
    }
    setPracticeProgress(progress);
  }, [mode]);

  const allPracticeItems = categoryItems(practiceCategory);
  const visiblePracticeItems = useMemo(() => [...allPracticeItems].sort((a, b) => b.year - a.year || a.scope.localeCompare(b.scope, "zh-CN") || a.sourceTitle.localeCompare(b.sourceTitle, "zh-CN") || a.title.localeCompare(b.title, "zh-CN")), [allPracticeItems]);
  const visibleTopicItems = useMemo(() => [...visiblePracticeItems].sort((a, b) => {
    const aIndex = TOPIC_ITEM_ORDER.indexOf(a.title);
    const bIndex = TOPIC_ITEM_ORDER.indexOf(b.title);
    return (aIndex < 0 ? TOPIC_ITEM_ORDER.length : aIndex) - (bIndex < 0 ? TOPIC_ITEM_ORDER.length : bIndex);
  }), [visiblePracticeItems]);
  const mockPaperGroups = useMemo(groupedMockPapers, []);
  const selectedFamily = JUNIOR_HIGH_PRACTICE_FAMILIES.find((family) => family.id === selectedFamilyId) ?? JUNIOR_HIGH_PRACTICE_FAMILIES[0];
  const selectedFamilyItems = practiceItemsForFamily(selectedFamily.id);
  const sourceCards = useMemo(() => sourcePaper ? buildJuniorHighSourcePracticeCards(sourcePaper) : [], [sourcePaper]);

  const openPracticeCategory = (category: JuniorHighPracticeCategory) => {
    window.history.replaceState(null, "", "/junior-high");
    setPracticeCategory(category);
    setPracticePaper(null);
    setSourcePaper(null);
    setMockPaper(null);
    setPracticeSourceItem(null);
    setPracticeError("");
    setSourceSelectionFilter("all");
    setMode("practice-select");
  };

  const openMockSelect = () => {
    window.history.replaceState(null, "", "/junior-high");
    setPracticePaper(null);
    setSourcePaper(null);
    setMockPaper(null);
    setPracticeSourceItem(null);
    setPracticeError("");
    setMode("mock-select");
  };

  const openPracticePaper = async (item: JuniorHighPracticeCatalogItem) => {
    setPracticeError("");
    setPracticeLoadingId(item.id);
    setPracticeCategory(item.category);
    try {
      const response = await fetch(`/junior-high/practice/${item.id}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const paper = canonicalizeJuniorHighQuestionSequence(applyJuniorHighQuestionOverrides(await response.json() as JuniorHighPaper, await loadJuniorHighQuestionOverrides()));
      const cards = item.category === "type" ? buildJuniorHighSourcePracticeCards(paper) : [];
      if (item.category === "type" && cards.length > 0) {
        const requestedGroupId = new URLSearchParams(window.location.search).get("group");
        const family = practiceFamilyForType(item.questionType);
        if (family) setSelectedFamilyId(family.id);
        setSourcePaper(paper);
        setPracticeSourceItem(item);
        if (requestedGroupId) {
          const card = cards.find((candidate) => candidate.id === requestedGroupId || candidate.groupIds.includes(requestedGroupId));
          if (card) {
            setPracticePaper(paperForSourceCard(paper, card));
            setMode("practice");
            return;
          }
        }
        window.history.replaceState(null, "", practicePaperUrl(item));
        setPracticePaper(null);
        setSourceSelectionFilter("all");
        setMode("source-select");
        return;
      }
      window.history.replaceState(null, "", practicePaperUrl(item));
      setPracticePaper(paper);
      setPracticeSourceItem(item);
      setMode("practice");
    } catch {
      setPracticeError("题目文件暂时无法打开，请稍后重试。");
    } finally {
      setPracticeLoadingId("");
    }
  };

  function openSourceCard(card: SourcePracticeCard) {
    if (!sourcePaper || !practiceSourceItem) return;
    const selectedPaper = paperForSourceCard(sourcePaper, card);
    window.history.replaceState(null, "", practicePaperUrl(practiceSourceItem, card.id));
    setPracticePaper(selectedPaper);
    setMode("practice");
  }

  function openTypeFamily(familyId: string) {
    const items = practiceItemsForFamily(familyId);
    if (!items.length) return;
    setSelectedFamilyId(familyId);
    void openPracticePaper(items[0]);
  }

  useEffect(() => {
    if (deepLinkApplied) return;
    const searchParams = new URLSearchParams(window.location.search);
    const deepLinkMode = searchParams.get("mode");
    if (deepLinkMode === "practice") {
      const item = JUNIOR_HIGH_PRACTICE_CATALOG.find((candidate) => candidate.id === searchParams.get("id") && (candidate.category === "topic" ? isEligibleTopicItem(candidate) : isEligiblePracticeItem(candidate)));
      if (!item) return;
      setDeepLinkApplied(true);
      void openPracticePaper(item);
      return;
    }
    if (deepLinkMode === "mock") {
      const paper = AVAILABLE_JUNIOR_HIGH_PAPERS.find((candidate) => mockPaperKey(candidate) === searchParams.get("paper"));
      if (!paper) return;
      setDeepLinkApplied(true);
      setPracticePaper(null);
      setPracticeSourceItem(null);
      setMockPaper(paper);
      setMode("mock");
    }
  }, [deepLinkApplied]);

  const tabs = (
    <div className="junior-high-practice-tabs">
      {(["topic", "type", "mock"] as JuniorHighTab[]).map((tab) => (
        <button
          className={(tab === "mock" ? mode === "mock-select" : mode === "practice-select" && practiceCategory === tab) ? "selected" : ""}
          key={tab}
          onClick={() => tab === "mock" ? openMockSelect() : openPracticeCategory(tab)}
          type="button"
        >
          {TAB_LABEL[tab]}
        </button>
      ))}
    </div>
  );
  const renderPracticeItem = (item: JuniorHighPracticeCatalogItem) => (
    <button
      className={`junior-high-practice-item ${practiceCategory === "topic" ? "junior-high-topic-practice-item" : "junior-high-type-practice-item"}`}
      disabled={practiceLoadingId === item.id}
      key={item.id}
      onClick={() => void openPracticePaper(item)}
      type="button"
    >
      <strong>{item.title.replace(/\s*[·•]\s*(可审计样本|待复核批次|已复核样本)/g, "")}</strong>
      <span>{practiceQuestionCount(item)} 题{practiceProgress[item.id]?.completed ? " · 已完成" : practiceProgress[item.id]?.answered ? " · 未完成" : ""}</span>
    </button>
  );

  if (mode === "practice-select") return (
    <section className="stack junior-high-page">
      <div className="junior-high-selection">
        <button className="junior-high-back" onClick={() => openPracticeCategory("topic")} type="button">← 返回中考英语</button>
        <h1>{CATEGORY_LABEL[practiceCategory]}</h1>
        <div className="junior-high-practice-toolbar junior-high-practice-toolbar-tabs-only">{tabs}</div>
        {practiceCategory === "type" ? (
          <>
            <div className="junior-high-type-progress" aria-label="题型训练完成进度">
              {(() => {
                const totalQuestions = visiblePracticeItems.reduce((sum, item) => sum + publishableQuestionCount(item), 0);
                const completedQuestions = visiblePracticeItems.reduce((sum, item) => sum + Math.min(publishableQuestionCount(item), practiceProgress[item.id]?.answered ?? 0), 0);
                return <><span>共 {totalQuestions} 题</span><span>已完成 {completedQuestions} 题</span><span>未完成 {Math.max(0, totalQuestions - completedQuestions)} 题</span></>;
              })()}
            </div>
            <div className="junior-high-practice-list junior-high-type-family-list">
              {JUNIOR_HIGH_PRACTICE_FAMILIES.map((family) => {
                const items = practiceItemsForFamily(family.id);
                const total = items.reduce((sum, item) => sum + publishableQuestionCount(item), 0);
                const answered = items.reduce((sum, item) => sum + Math.min(publishableQuestionCount(item), practiceProgress[item.id]?.answered ?? 0), 0);
                return <button className="junior-high-practice-family-card" key={family.id} onClick={() => openTypeFamily(family.id)} type="button">
                  <span className="junior-high-practice-family-copy"><strong>{family.title}</strong><small>{items.map((item) => item.title).join(" · ")}</small></span>
                  <span className="junior-high-practice-family-stats"><b>{total} 题</b><small>已完成 {answered} 题</small><small>未完成 {Math.max(0, total - answered)} 题</small></span>
                </button>;
              })}
            </div>
          </>
        ) : (
          <div className="junior-high-practice-list junior-high-topic-practice-list">
            {visibleTopicItems.map(renderPracticeItem)}
          </div>
        )}
        {practiceError ? <p className="junior-high-selection-error">{practiceError}</p> : null}
        {visiblePracticeItems.length === 0 ? <p className="junior-high-selection-empty-text">没有匹配的练习。</p> : null}
      </div>
    </section>
  );

  if (mode === "source-select" && sourcePaper && practiceSourceItem) return (
    <section className="stack junior-high-page">
      <div className="junior-high-selection">
        <button className="junior-high-back" onClick={() => openPracticeCategory("type")} type="button">← 返回题型训练</button>
        <h1>{selectedFamily.title}</h1>
        <div className="junior-high-practice-subtype-tabs" aria-label="细分题型筛选">
          {selectedFamilyItems.map((item) => <button className={item.id === practiceSourceItem.id ? "selected" : ""} disabled={practiceLoadingId === item.id} key={item.id} onClick={() => void openPracticePaper(item)} type="button">{item.title}</button>)}
        </div>
        <h2 className="junior-high-source-list-title">{practiceSourceItem.title}</h2>
        <p className="junior-high-selection-lead">按真实来源选择一套练习；每套题按页面顺序从 1 连续编号。</p>
        {(() => {
          const questionsById = new Map(sourcePaper.questions.map((question) => [question.id, question]));
          const writingTasksById = new Map((sourcePaper.writingTasks ?? []).map((task) => [task.id, task]));
          const allCards = sourceCards.map((card) => {
            const questions = card.orderedQuestionIds.map((id) => questionsById.get(id)).filter((question): question is JuniorHighPaper["questions"][number] => Boolean(question));
            const writingTasks = card.writingTaskIds.map((id) => writingTasksById.get(id)).filter(Boolean);
            const answeredQuestions = questions.filter((question) => Boolean(sourceAttempt.answers[question.id]?.trim()));
            const answeredWriting = writingTasks.filter((task) => Boolean(task && sourceAttempt.writingAnswers[task.id]?.trim()));
            const total = questions.length + writingTasks.length;
            const answered = answeredQuestions.length + answeredWriting.length;
            return { card, questions, total, answered, completed: total > 0 && answered === total };
          });
          const completedCount = allCards.filter((summary) => summary.completed).length;
          const visibleCards = allCards.filter((summary) => sourceSelectionFilter === "all" || (sourceSelectionFilter === "completed" ? summary.completed : !summary.completed));
          return <>
            <div className="junior-high-cloze-progress" aria-label="题型训练来源完成进度">
              <button className={sourceSelectionFilter === "all" ? "active" : ""} onClick={() => setSourceSelectionFilter("all")} type="button">共 {allCards.length} 套题目</button>
              <button className={sourceSelectionFilter === "completed" ? "active" : ""} onClick={() => setSourceSelectionFilter("completed")} type="button">已完成 {completedCount} 套</button>
              <button className={sourceSelectionFilter === "incomplete" ? "active" : ""} onClick={() => setSourceSelectionFilter("incomplete")} type="button">未完成 {allCards.length - completedCount} 套</button>
            </div>
            <div className="junior-high-practice-groups junior-high-source-practice-list">
          {visibleCards.map(({ card, questions, total, answered, completed }) => {
            const answeredQuestions = questions.filter((question) => Boolean(sourceAttempt.answers[question.id]?.trim()));
            const correct = answeredQuestions.filter((question) => practiceAnswerIsCorrect(question, sourceAttempt.answers[question.id] ?? "")).length;
            return <button className={`junior-high-practice-item junior-high-cloze-source-item ${completed ? "completed" : ""}`} data-source-file={card.sourceFile} data-source-section={card.sourceSection} key={card.id} onClick={() => openSourceCard(card)} type="button"><strong>{card.title}</strong><span className="junior-high-cloze-stats">共 {total} 题 · 已完成 {answered} · 未完成 {total - answered} · 正确 {correct} · 错误 {answeredQuestions.length - correct}</span></button>;
          })}
            </div>
          </>;
        })()}
        {practiceError ? <p className="junior-high-selection-error">{practiceError}</p> : null}
      </div>
    </section>
  );

  if (mode === "mock-select") return (
    <section className="stack junior-high-page">
      <div className="junior-high-selection">
        <button className="junior-high-back" onClick={() => openPracticeCategory("topic")} type="button">← 返回中考英语</button>
        <h1>模考真题</h1>
        <div className="junior-high-practice-toolbar junior-high-practice-toolbar-tabs-only">{tabs}</div>
        <div className="junior-high-mock-paper-groups">
          {mockPaperGroups.map((group) => (
            <section className="junior-high-practice-group junior-high-mock-paper-group" key={group.year}>
              <h2>{group.year}年</h2>
              <div className="junior-high-mock-paper-list">
                {group.papers.map((paper) => (
                  <button
                    className="junior-high-practice-item junior-high-mock-paper-item"
                    key={mockPaperKey(paper)}
                    onClick={() => {
                      setMockPaper(paper);
                      setMode("mock");
                    }}
                    type="button"
                  >
                    <strong>{mockPaperTitle(paper)}</strong>
                    <span>{paper.questions.length} 题</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );

  if (mode === "practice" && practicePaper) return (
    <JuniorHighPaperWorkbench
      isAdmin={isAdmin}
      adminUserId={adminUserId}
      autoStart={false}
      key={`${practicePaper.fileName}:${practicePaper.parts?.flatMap((part) => part.groups ?? [])[0]?.id ?? practicePaper.writingTasks?.[0]?.id ?? "all"}`}
      onBack={() => {
        if (practiceSourceItem?.category === "type" && sourcePaper) {
          window.history.replaceState(null, "", practicePaperUrl(practiceSourceItem));
          setMode("source-select");
        } else {
          window.history.replaceState(null, "", "/junior-high");
          setMode("practice-select");
        }
      }}
      paper={practicePaper}
      source={practiceSourceItem ? {
        id: practiceSourceItem.category === "type" && practicePaper.parts?.flatMap((part) => part.groups ?? [])[0]?.id
          ? `${practiceSourceItem.id}:group:${practicePaper.parts.flatMap((part) => part.groups ?? [])[0].id}`
          : practiceSourceItem.id,
        mode: "practice",
        questionType: practiceSourceItem.questionType,
        title: practicePaper.displayTitle ?? practiceSourceItem.title,
        topicGroup: practiceSourceItem.topicGroup,
      } : undefined}
      timerMode="stopwatch"
    />
  );

  if (mode === "mock" && mockPaper) return (
    <JuniorHighPaperWorkbench
      isAdmin={isAdmin}
      adminUserId={adminUserId}
      autoStart
      key={mockPaper.fileName}
      onBack={() => setMode("mock-select")}
      paper={mockPaper}
      source={{
        id: mockPaperKey(mockPaper),
        mode: "mock",
        title: mockPaperTitle(mockPaper),
      }}
      timerMode="countdown"
    />
  );

  return (
    <section className="stack junior-high-page">
      <div className="junior-high-selection junior-high-selection-empty">
        <button className="junior-high-back" onClick={() => openPracticeCategory("topic")} type="button">← 返回选择</button>
        <h1>暂未找到对应内容</h1>
        <p>{mode === "mock" ? "模考真题" : CATEGORY_LABEL[practiceCategory]}</p>
      </div>
    </section>
  );
}
