"use client";

import { useEffect, useMemo, useState } from "react";
import type { SeniorHighCatalog, SeniorHighItem } from "@/lib/senior-high/types";
import {
  SENIOR_HIGH_OVERRIDE_SLUG,
  applySeniorHighItemOverride,
  loadSeniorHighQuestionOverrides,
  type SeniorHighQuestionOverrides,
} from "@/lib/senior-high/question-overrides";
import { supabase } from "@/lib/supabase/client";

type Draft = { answer: string; analysis: string; options: string; stem: string };

function flattenCatalog(catalog: SeniorHighCatalog) {
  return [
    ...catalog.knowledge,
    ...catalog.practice,
    ...catalog.papers.flatMap((paper) => paper.questions.filter((question) => question.active)),
  ];
}

function itemText(item: SeniorHighItem) {
  return `${item.title} ${item.stem} ${item.answer}`;
}

export function AdminSeniorHighQuestionEditor({ adminUserId }: { adminUserId: string }) {
  const [items, setItems] = useState<SeniorHighItem[]>([]);
  const [overrides, setOverrides] = useState<SeniorHighQuestionOverrides>({});
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Draft>({ answer: "", analysis: "", options: "", stem: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadEditor();
  }, []);

  async function loadEditor() {
    setLoading(true);
    const [catalogResponse, savedOverrides] = await Promise.all([
      fetch("/senior-high/catalog.json"),
      loadSeniorHighQuestionOverrides(),
    ]);
    if (!catalogResponse.ok) {
      setMessage("无法读取高考英语题库。");
      setLoading(false);
      return;
    }
    const catalog = await catalogResponse.json() as SeniorHighCatalog;
    const loadedItems = flattenCatalog(catalog);
    setItems(loadedItems);
    setOverrides(savedOverrides);
    const first = loadedItems.find((item) => !savedOverrides[item.id]?.deleted);
    if (first) selectItem(first, savedOverrides);
    setLoading(false);
  }

  function selectItem(item: SeniorHighItem, currentOverrides = overrides) {
    const selected = applySeniorHighItemOverride(item, currentOverrides);
    setSelectedId(item.id);
    setDraft({
      answer: selected.answer,
      analysis: selected.analysis,
      options: selected.options.map((option) => `${option.letter}. ${option.text}`).join("\n"),
      stem: selected.stem,
    });
    setMessage("");
  }

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => !keyword || itemText(item).toLowerCase().includes(keyword)).slice(0, 100);
  }, [items, search]);

  async function persist(nextOverrides: SeniorHighQuestionOverrides) {
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("managed_content_pages").upsert({
      created_by: adminUserId,
      meta_json: {
        overrides: nextOverrides,
        contentVersion: 1,
        audit: { updatedAt: now, updatedBy: adminUserId },
      },
      module: "training",
      published_at: now,
      slug: SENIOR_HIGH_OVERRIDE_SLUG,
      status: "published",
      summary: "高考英语题目管理员覆盖内容",
      template_key: "senior_high_question_overrides",
      title: "高考英语题目覆盖内容",
      updated_at: now,
    }, { onConflict: "slug" });
    setSaving(false);
    if (error) {
      setMessage(`保存失败：${error.message}`);
      return false;
    }
    setOverrides(nextOverrides);
    setMessage("已保存，前台刷新后生效；来源和管理员审计信息已保留。");
    return true;
  }

  async function saveItem() {
    const selected = items.find((item) => item.id === selectedId);
    if (!selected) return;
    const now = new Date().toISOString();
    const options = draft.options.split("\n").map((line, index) => {
      const match = line.trim().match(/^([A-H])\s*[.、)）:]?\s*(.*)$/i);
      return { letter: match?.[1]?.toUpperCase() || String.fromCharCode(65 + index), text: match?.[2] || line.trim() };
    }).filter((option) => option.text);
    await persist({
      ...overrides,
      [selectedId]: {
        ...overrides[selectedId],
        action: "update",
        deleted: false,
        patch: { stem: draft.stem, options, answer: draft.answer.trim(), analysis: draft.analysis },
        updatedAt: now,
        updatedBy: adminUserId,
      },
    });
  }

  async function deleteItem() {
    if (!selectedId) return;
    const now = new Date().toISOString();
    await persist({
      ...overrides,
      [selectedId]: { ...overrides[selectedId], action: "delete", deleted: true, updatedAt: now, updatedBy: adminUserId },
    });
  }

  if (loading) return <section className="admin-editor-panel"><p>正在读取高考英语题目…</p></section>;
  const selected = items.find((item) => item.id === selectedId);
  return <section className="admin-editor-panel">
    <div className="admin-editor-panel-header"><div><span className="eyebrow">Senior high · English</span><h2>高考英语题目管理</h2><p>可修改已发布题目的题干、选项、答案和解析，也可下线题目；原始来源不会被覆盖。</p></div><strong>{items.length} 题</strong></div>
    <input className="admin-search-input" onChange={(event) => setSearch(event.target.value)} placeholder="搜索来源、题干或答案" value={search} />
    <div className="admin-question-editor-layout">
      <div className="admin-question-list">{visibleItems.map((item) => <button className={item.id === selectedId ? "active" : ""} key={item.id} onClick={() => selectItem(item)} type="button"><strong>{overrides[item.id]?.deleted ? "已下线 · " : ""}{item.title}</strong><span>{itemText(item).slice(0, 100)}</span></button>)}</div>
      {selected ? <div className="admin-question-form">
        <h3>{selected.title} · 第 {selected.display_number ?? selected.question_number} 题</h3>
        <small>来源：{selected.source_relpath} · SHA-256：{selected.source_sha256}</small>
        <label>题干<textarea onChange={(event) => setDraft((current) => ({ ...current, stem: event.target.value }))} rows={5} value={draft.stem} /></label>
        <label>选项（每行一个，可写 A. 选项）<textarea onChange={(event) => setDraft((current) => ({ ...current, options: event.target.value }))} rows={7} value={draft.options} /></label>
        <label>答案<input onChange={(event) => setDraft((current) => ({ ...current, answer: event.target.value }))} value={draft.answer} /></label>
        <label>解析<textarea onChange={(event) => setDraft((current) => ({ ...current, analysis: event.target.value }))} rows={9} value={draft.analysis} /></label>
        <div className="admin-question-form-actions"><button className="button primary" disabled={saving} onClick={() => void saveItem()} type="button">保存修改</button><button className="button danger" disabled={saving} onClick={() => void deleteItem()} type="button">下线题目</button></div>
      </div> : <p>{message || "请选择题目。"}</p>}
    </div>
    {message ? <p className="admin-form-message">{message}</p> : null}
  </section>;
}
