"use client";

import { useEffect, useMemo, useState } from "react";
import type { JuniorHighPaper, JuniorHighQuestion } from "@/lib/junior-high/paper-types";
import {
  JUNIOR_HIGH_OVERRIDE_SLUG,
  type JuniorHighQuestionOverrides,
  loadJuniorHighQuestionOverrides,
} from "@/lib/junior-high/question-overrides";
import { supabase } from "@/lib/supabase/client";

const PAPER_ID = "practice-pilot-cloze-passage-1";

function questionText(question: JuniorHighQuestion) {
  return `${question.prompt} ${question.context ?? ""}`.trim();
}

export function AdminJuniorHighQuestionEditor({ adminUserId }: { adminUserId: string }) {
  const [paper, setPaper] = useState<JuniorHighPaper | null>(null);
  const [overrides, setOverrides] = useState<JuniorHighQuestionOverrides>({});
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState({ answer: "", analysis: "", options: "", prompt: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadEditor();
  }, []);

  async function loadEditor() {
    setLoading(true);
    const [paperResponse, savedOverrides] = await Promise.all([
      fetch(`/junior-high/practice/${PAPER_ID}.json`),
      loadJuniorHighQuestionOverrides(),
    ]);
    if (!paperResponse.ok) {
      setMessage("无法读取完形填空题库。");
      setLoading(false);
      return;
    }
    const loadedPaper = await paperResponse.json() as JuniorHighPaper;
    setPaper(loadedPaper);
    setOverrides(savedOverrides);
    const first = loadedPaper.questions.find((question) => !savedOverrides[question.id]?.deleted);
    if (first) selectQuestion(first, savedOverrides);
    setLoading(false);
  }

  function selectQuestion(question: JuniorHighQuestion, currentOverrides = overrides) {
    const patch = currentOverrides[question.id]?.patch ?? {};
    setSelectedId(question.id);
    setDraft({
      answer: String(patch.answer ?? question.answer ?? ""),
      analysis: String(patch.analysis ?? question.analysis ?? ""),
      options: (patch.options ?? question.options ?? []).join("\n"),
      prompt: String(patch.prompt ?? question.prompt ?? ""),
    });
    setMessage("");
  }

  const visibleQuestions = useMemo(() => {
    if (!paper) return [];
    const keyword = search.trim().toLowerCase();
    return paper.questions.filter((question) => {
      if (!keyword) return true;
      return `${question.number} ${questionText(question)} ${question.answer}`.toLowerCase().includes(keyword);
    }).slice(0, 80);
  }, [paper, search]);

  async function persist(nextOverrides: JuniorHighQuestionOverrides) {
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("managed_content_pages").upsert({
      created_by: adminUserId,
      meta_json: { overrides: nextOverrides, contentVersion: 1 },
      module: "training",
      published_at: now,
      slug: JUNIOR_HIGH_OVERRIDE_SLUG,
      status: "published",
      summary: "中考英语题目管理员覆盖内容",
      template_key: "site_announcement_page",
      title: "中考英语题目覆盖内容",
      updated_at: now,
    }, { onConflict: "slug" });
    setSaving(false);
    if (error) {
      setMessage(`保存失败：${error.message}`);
      return false;
    }
    setOverrides(nextOverrides);
    setMessage("已保存，前台刷新后生效。");
    return true;
  }

  async function saveQuestion() {
    if (!paper || !selectedId) return;
    const nextOverrides = {
      ...overrides,
      [selectedId]: {
        patch: {
          answer: draft.answer.trim(),
          analysis: draft.analysis,
          options: draft.options.split("\n").map((option) => option.trim()).filter(Boolean),
          prompt: draft.prompt,
        },
      },
    };
    await persist(nextOverrides);
  }

  async function deleteQuestion() {
    if (!selectedId) return;
    await persist({ ...overrides, [selectedId]: { deleted: true } });
    setMessage("题目已标记删除，前台刷新后隐藏。");
  }

  if (loading) return <section className="admin-editor-panel"><p>正在读取题目…</p></section>;
  if (!paper) return <section className="admin-editor-panel"><p>{message || "题目暂不可用。"}</p></section>;
  const selected = paper.questions.find((question) => question.id === selectedId);

  return <section className="admin-editor-panel">
    <div className="admin-editor-panel-header"><div><span className="eyebrow">Junior high · cloze</span><h2>完形填空题目管理</h2><p>可修改题干、选项、答案和解析，也可隐藏题目。</p></div><strong>{paper.questions.length} 题</strong></div>
    <input className="admin-search-input" onChange={(event) => setSearch(event.target.value)} placeholder="搜索题号、题干或答案" value={search} />
    <div className="admin-question-editor-layout">
      <div className="admin-question-list">{visibleQuestions.map((question) => <button className={question.id === selectedId ? "active" : ""} key={question.id} onClick={() => selectQuestion(question)} type="button"><strong>第 {question.displayNumber ?? question.number} 题</strong><span>{overrides[question.id]?.deleted ? "已删除" : questionText(question).slice(0, 80)}</span></button>)}</div>
      {selected ? <div className="admin-question-form">
        <h3>第 {selected.displayNumber ?? selected.number} 题</h3>
        <label>题干<textarea onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} rows={4} value={draft.prompt} /></label>
        <label>选项（每行一个）<textarea onChange={(event) => setDraft((current) => ({ ...current, options: event.target.value }))} rows={6} value={draft.options} /></label>
        <label>答案<input onChange={(event) => setDraft((current) => ({ ...current, answer: event.target.value }))} value={draft.answer} /></label>
        <label>解析<textarea onChange={(event) => setDraft((current) => ({ ...current, analysis: event.target.value }))} rows={8} value={draft.analysis} /></label>
        <div className="admin-question-form-actions"><button className="button primary" disabled={saving} onClick={() => void saveQuestion()} type="button">保存修改</button><button className="button danger" disabled={saving} onClick={() => void deleteQuestion()} type="button">删除题目</button></div>
      </div> : <p>请选择题目。</p>}
    </div>
    {message ? <p className="admin-form-message">{message}</p> : null}
  </section>;
}
