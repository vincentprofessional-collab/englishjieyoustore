"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCet4ContentOverrides, saveCet4ContentOverrides, type ExamContentOverrideScope } from "@/lib/cet4/content-overrides";
import type { SeniorHighAnswerSpec, SeniorHighBlock, SeniorHighQuestion, SeniorHighSet } from "@/lib/senior-high/v2-types";
import { cleanExamSetNotice } from "@/lib/senior-high/v2-content-cleanup";

type Props = { set: SeniorHighSet; adminUserId: string; scope?: ExamContentOverrideScope; onSaved: (set: SeniorHighSet) => void };

function removeImages(value: unknown): unknown {
  if (Array.isArray(value)) return value.flatMap((item) => item && typeof item === "object" && "type" in item && item.type === "image" ? [] : [removeImages(item)]);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    if (key === "assetRefs" && Array.isArray(item)) return [[key, item.filter((asset) => !asset || typeof asset !== "object" || !("kind" in asset) || asset.kind !== "image")]];
    const next = removeImages(item);
    return next === undefined ? [] : [[key, next]];
  }));
}

function allQuestions(set: SeniorHighSet) {
  return set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions));
}

function parseJson<T>(text: string, label: string): T {
  try { return JSON.parse(text) as T; } catch { throw new Error(`${label}不是有效 JSON。`); }
}

export function Cet4SetAdminEditor({ set, adminUserId, scope = "cet4", onSaved }: Props) {
  const [draft, setDraft] = useState(() => JSON.stringify(set, null, 2));
  const [selectedQuestionId, setSelectedQuestionId] = useState(() => allQuestions(set)[0]?.id || "");
  const [promptDraft, setPromptDraft] = useState("[]");
  const [answerDraft, setAnswerDraft] = useState("{}");
  const [explanationDraft, setExplanationDraft] = useState("[]");
  const [groupKey, setGroupKey] = useState("");
  const [passageDraft, setPassageDraft] = useState("[]");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const parsedSet = useMemo(() => {
    try { return JSON.parse(draft) as SeniorHighSet; } catch { return null; }
  }, [draft]);
  const question = parsedSet ? allQuestions(parsedSet).find((item) => item.id === selectedQuestionId) : undefined;
  const groups = parsedSet?.sections.flatMap((section) => section.groups.map((group) => ({ key: `${section.id}/${group.id}`, label: `${section.title} · ${group.title || group.id}`, group }))) || [];
  const selectedGroup = groups.find((item) => item.key === groupKey) || groups[0];

  useEffect(() => {
    setDraft(JSON.stringify(set, null, 2));
    setSelectedQuestionId(allQuestions(set)[0]?.id || "");
    setMessage("");
  }, [set]);

  useEffect(() => {
    if (!question) return;
    setPromptDraft(JSON.stringify(question.promptBlocks, null, 2));
    setAnswerDraft(JSON.stringify(question.answerSpec, null, 2));
    setExplanationDraft(JSON.stringify(question.explanationBlocks, null, 2));
  }, [question?.id]);

  useEffect(() => {
    if (!selectedGroup) return;
    setGroupKey(selectedGroup.key);
    setPassageDraft(JSON.stringify(selectedGroup.group.stimulusBlocks, null, 2));
  }, [selectedGroup?.key]);

  function replaceDraft(next: SeniorHighSet) {
    setDraft(JSON.stringify(next, null, 2));
    setMessage("修改已放入本卷草稿；完成后点击“保存本卷修改”。");
  }

  function applyQuestionFields() {
    if (!parsedSet || !question) return;
    try {
      const promptBlocks = parseJson<SeniorHighBlock[]>(promptDraft, "题目原文");
      const answerSpec = parseJson<SeniorHighAnswerSpec>(answerDraft, "答案");
      const explanationBlocks = parseJson<SeniorHighBlock[]>(explanationDraft, "解析");
      const next = { ...parsedSet, sections: parsedSet.sections.map((section) => ({ ...section, groups: section.groups.map((group) => ({ ...group, questions: group.questions.map((item) => item.id === question.id ? { ...item, promptBlocks, answerSpec, explanationBlocks } : item) })) })) };
      replaceDraft(next);
    } catch (error) { setMessage(error instanceof Error ? error.message : "题目内容无法解析。"); }
  }

  function applyPassage() {
    if (!parsedSet || !selectedGroup) return;
    try {
      const stimulusBlocks = parseJson<SeniorHighBlock[]>(passageDraft, "文章原文");
      const next = { ...parsedSet, sections: parsedSet.sections.map((section) => ({ ...section, groups: section.groups.map((group) => `${section.id}/${group.id}` === selectedGroup.key ? { ...group, stimulusBlocks } : group) })) };
      replaceDraft(next);
    } catch (error) { setMessage(error instanceof Error ? error.message : "文章原文无法解析。"); }
  }

  function addQuestion() {
    if (!parsedSet || !selectedGroup) return;
    const nextNumber = allQuestions(parsedSet).reduce((max, item) => Math.max(max, item.displayNumber), 0) + 1;
    const id = `${set.id}-admin-q-${Date.now()}`;
    const added: SeniorHighQuestion = {
      id, displayNumber: nextNumber, typeLabel: "简答题", type: "short_answer", promptBlocks: [{ type: "paragraph", runs: [{ type: "text", text: "请编辑题目原文。" }] }], placement: { kind: "standalone" }, options: [], blanks: [], answerSpec: { availability: "none", gradingMode: "none", kind: "none" }, explanationBlocks: [], sourceRefs: [], reviewStatus: "review_required",
    };
    const next = { ...parsedSet, sections: parsedSet.sections.map((section) => ({ ...section, groups: section.groups.map((group) => `${section.id}/${group.id}` === selectedGroup.key ? { ...group, questions: [...group.questions, added] } : group) })) };
    replaceDraft(next);
    setSelectedQuestionId(id);
  }

  function deleteQuestion() {
    if (!parsedSet || !question) return;
    const next = { ...parsedSet, sections: parsedSet.sections.map((section) => ({ ...section, groups: section.groups.map((group) => ({ ...group, questions: group.questions.filter((item) => item.id !== question.id) })) })) };
    const remaining = allQuestions(next);
    replaceDraft(next);
    setSelectedQuestionId(remaining[0]?.id || "");
  }

  async function saveSet() {
    if (!parsedSet || parsedSet.schemaVersion !== 2 || parsedSet.id !== set.id || !Array.isArray(parsedSet.sections)) {
      setMessage("本卷 JSON 格式无效，或试图修改本卷 ID；请检查后再保存。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const current = await loadCet4ContentOverrides(scope);
      const cleaned = cleanExamSetNotice(parsedSet);
      current[set.id] = { set: cleaned, updatedAt: new Date().toISOString(), updatedBy: adminUserId };
      await saveCet4ContentOverrides(adminUserId, current, scope);
      onSaved(cleaned);
      setMessage("本卷已保存，刷新后仍会保留。");
    } catch (error) { setMessage(error instanceof Error ? `保存失败：${error.message}` : "保存失败，请稍后重试。"); }
    finally { setBusy(false); }
  }

  const examLabel = scope === "cet4" ? "大学英语四级" : scope === "cet6" ? "大学英语六级" : scope === "kaoyan" ? "考研英语" : "高中英语";
  return <details className="cet4-content-admin exam-admin-panel"><summary>管理员：编辑本卷与题目</summary><div className="cet4-content-admin-body">
    <p>可修改卷面原文、题目、答案和解析；新增或删除题目后，点击最下方保存。内容按现有题目 JSON 结构校验。</p>
    <label>本卷标题<input onChange={(event) => { if (parsedSet) replaceDraft({ ...parsedSet, title: event.target.value }); }} value={parsedSet?.title || ""} /></label>
    {groups.length ? <div className="cet4-content-admin-fields"><label>文章／材料<select onChange={(event) => setGroupKey(event.target.value)} value={selectedGroup?.key || ""}>{groups.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label>卷面原文（JSON 区块）<textarea onChange={(event) => setPassageDraft(event.target.value)} rows={8} value={passageDraft} /><button onClick={applyPassage} type="button">应用文章原文</button></label></div> : null}
    <div className="cet4-content-admin-fields"><label>题目<select onChange={(event) => setSelectedQuestionId(event.target.value)} value={question?.id || ""}>{allQuestions(parsedSet || set).map((item) => <option key={item.id} value={item.id}>{item.displayLabel || `第 ${item.displayNumber} 题`} · ${item.typeLabel || item.type}</option>)}</select></label>
      {question ? <><label>题目原文（JSON 区块）<textarea onChange={(event) => setPromptDraft(event.target.value)} rows={6} value={promptDraft} /></label><label>答案（JSON）<textarea onChange={(event) => setAnswerDraft(event.target.value)} rows={4} value={answerDraft} /></label><label>解析（JSON 区块）<textarea onChange={(event) => setExplanationDraft(event.target.value)} rows={6} value={explanationDraft} /></label><div className="cet4-content-admin-actions"><button onClick={applyQuestionFields} type="button">应用题目、答案与解析</button><button className="danger" onClick={deleteQuestion} type="button">删除当前题目</button></div></> : <p>本卷暂无题目。先选择一篇文章，再添加题目。</p>}
      <button onClick={addQuestion} type="button">增加简答题</button>
    </div>
    <div className="cet4-content-admin-actions"><button onClick={() => { try { setDraft(JSON.stringify(cleanExamSetNotice(removeImages(parseJson<SeniorHighSet>(draft, "本卷内容")) as SeniorHighSet), null, 2)); setMessage("已清除答题卡提示等误混入的非题目文字及图片；保存本卷后生效。"); } catch (error) { setMessage(error instanceof Error ? error.message : "本卷内容无法处理。"); } }} type="button">清除非题目提示与图片</button><button className="primary" disabled={busy || !parsedSet} onClick={() => void saveSet()} type="button">{busy ? "正在保存…" : `保存${examLabel}本卷修改`}</button></div>
    <details><summary>高级：编辑完整本卷 JSON</summary><textarea aria-label="完整本卷 JSON" className="cet4-content-admin-json" onChange={(event) => setDraft(event.target.value)} rows={18} value={draft} /></details>
    {message ? <p aria-live="polite" className="cet4-content-admin-message">{message}</p> : null}
  </div></details>;
}
