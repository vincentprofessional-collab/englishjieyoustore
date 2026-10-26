"use client";

import { useEffect, useMemo, useState } from "react";
import {
  saveExamPrepQuestionOverrides,
  type ExamPrepOption,
  type ExamPrepQuestion,
  type ExamPrepQuestionOverrideState,
} from "@/lib/exam-prep/question-overrides";
import { supabase } from "@/lib/supabase/client";

type Draft = {
  number: string;
  group: string;
  passageTitle: string;
  passage: string;
  prompt: string;
  options: string;
  answer: string;
  answerMode: string;
  responseType: string;
  optionGroupCount: string;
  explanation: string;
  reviewRequired: boolean;
  reviewReasons: string;
  sourceFile: string;
  sourcePath: string;
  sourcePage: string;
  sourcePageVerified: boolean;
  sourceOptionsVerified: boolean;
  answerSourceFile: string;
  answerSourceVerified: boolean;
  explanationSourceFile: string;
  explanationSourceVerified: boolean;
  passageSourceFile: string;
  passageSourcePath: string;
  passageSourcePage: string;
  passageSourceVerified: boolean;
};

function serializeOptions(options: ExamPrepOption[] = []) {
  return options.map((option) => `${option.label}|${option.text}`).join("\n");
}

function parseOptions(value: string): ExamPrepOption[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const match = line.match(/^([A-I])\s*(?:\||\.)\s*(.*)$/i);
    return match
      ? { label: match[1].toUpperCase(), text: match[2].trim() }
      : { label: String.fromCharCode(65 + index), text: line };
  });
}

function groupOptions(options: ExamPrepOption[], groupCount: number) {
  if (groupCount < 1 || options.length % groupCount !== 0) return [];
  const size = options.length / groupCount;
  return Array.from({ length: groupCount }, (_, index) => options.slice(index * size, (index + 1) * size));
}

function draftFrom(question?: ExamPrepQuestion): Draft {
  return {
    number: String(question?.number ?? 1),
    group: question?.group || "",
    passageTitle: question?.passageTitle || "",
    passage: question?.passage || "",
    prompt: question?.prompt || question?.stem || "",
    options: serializeOptions(question?.options),
    answer: question?.answer || "",
    answerMode: question?.answerMode || "choice",
    responseType: question?.responseType || "",
    optionGroupCount: String(question?.optionGroups?.length || 0),
    explanation: question?.explanation || "",
    reviewRequired: Boolean(question?.reviewRequired),
    reviewReasons: (question?.reviewReasons || []).join("\n"),
    sourceFile: question?.source?.file || question?.source?.path || "",
    sourcePath: question?.source?.path || "",
    sourcePage: String(question?.source?.page || ""),
    sourcePageVerified: Boolean(question?.source?.pageVerified),
    sourceOptionsVerified: Boolean(question?.source?.optionsVerified),
    answerSourceFile: question?.source?.answerSourceFile || question?.source?.answerFile || question?.source?.file || "",
    answerSourceVerified: Boolean(question?.source?.answerSourceVerified),
    explanationSourceFile: question?.source?.explanationSourceFile || "",
    explanationSourceVerified: Boolean(question?.source?.explanationSourceVerified),
    passageSourceFile: question?.source?.passageSourceFile || "",
    passageSourcePath: question?.source?.passageSourcePath || "",
    passageSourcePage: String(question?.source?.passagePage || ""),
    passageSourceVerified: Boolean(question?.source?.passageVerified),
  };
}

export function ExamPrepQuestionAdmin({
  exam,
  setId,
  questions,
  overrideState,
  onChange,
}: {
  exam: string;
  setId: string;
  questions: ExamPrepQuestion[];
  overrideState: ExamPrepQuestionOverrideState;
  onChange: (state: ExamPrepQuestionOverrideState) => void;
}) {
  const [adminUserId, setAdminUserId] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Draft>(() => draftFrom());
  const [newDraft, setNewDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (active && profile?.role === "admin") setAdminUserId(user.id);
    })();
    return () => { active = false; };
  }, []);

  const mergedQuestions = useMemo(() => [
    ...questions.map((question) => ({ ...question, ...(overrideState.overrides[question.id || ""]?.patch || {}) })),
    ...overrideState.additions,
  ], [overrideState, questions]);
  const selectedQuestion = mergedQuestions.find((question) => question.id === selectedId);
  const isDeleted = Boolean(selectedId && overrideState.overrides[selectedId]?.deleted);

  useEffect(() => {
    if (selectedQuestion && !newDraft) setDraft(draftFrom(selectedQuestion));
  }, [selectedId, newDraft, selectedQuestion]);

  async function persist(next: ExamPrepQuestionOverrideState) {
    if (!adminUserId) return false;
    setSaving(true);
    setMessage("");
    try {
      const error = await saveExamPrepQuestionOverrides(adminUserId, exam, setId, next);
      if (error) setMessage(`保存失败：${error.message}`);
      else {
        onChange(next);
        setMessage("已保存，前台题库已更新。");
      }
      setSaving(false);
      return !error;
    } catch (error) {
      setMessage(`保存失败：${error instanceof Error ? error.message : "数据库请求失败"}`);
      setSaving(false);
      return false;
    }
  }

  function addQuestion() {
    const id = `admin-${crypto.randomUUID()}`;
    setSelectedId(id);
    setDraft({ ...draftFrom(), group: questions[0]?.group || "", reviewRequired: true, reviewReasons: "新增题目待来源核对" });
    setNewDraft(true);
    setMessage("填写内容后点击“保存题目”即可新增。");
  }

  async function saveDraft() {
    const id = selectedId || `admin-${crypto.randomUUID()}`;
    const options = parseOptions(draft.options);
    const reviewReasons = draft.reviewRequired ? draft.reviewReasons.split(/\n|；/).map((reason) => reason.trim()).filter(Boolean) : [];
    const oldOptions = selectedQuestion?.options || [];
    const promptChanged = Boolean(selectedQuestion && draft.prompt.trim() !== (selectedQuestion.prompt || selectedQuestion.stem || ""));
    const optionsChanged = Boolean(selectedQuestion && JSON.stringify(options) !== JSON.stringify(oldOptions));
    const answerChanged = Boolean(selectedQuestion && draft.answer.trim() !== (selectedQuestion.answer || ""));
    const explanationChanged = Boolean(selectedQuestion && draft.explanation.trim() !== (selectedQuestion.explanation || ""));
    const passageChanged = Boolean(selectedQuestion && draft.passage.trim() !== (selectedQuestion.passage || ""));
    const sourceFileChanged = Boolean(selectedQuestion && draft.sourceFile.trim() !== (selectedQuestion.source?.file || selectedQuestion.source?.path || ""));
    const sourcePathChanged = Boolean(selectedQuestion && draft.sourcePath.trim() !== (selectedQuestion.source?.path || ""));
    const sourcePageChanged = Boolean(selectedQuestion && Number(draft.sourcePage) !== Number(selectedQuestion.source?.page || 0));
    const answerFileChanged = Boolean(selectedQuestion && draft.answerSourceFile.trim() !== (selectedQuestion.source?.answerSourceFile || selectedQuestion.source?.answerFile || selectedQuestion.source?.file || ""));
    const explanationFileChanged = Boolean(selectedQuestion && draft.explanationSourceFile.trim() !== (selectedQuestion.source?.explanationSourceFile || ""));
    const passageFileChanged = Boolean(selectedQuestion && draft.passageSourceFile.trim() !== (selectedQuestion.source?.passageSourceFile || ""));
    const passagePathChanged = Boolean(selectedQuestion && draft.passageSourcePath.trim() !== (selectedQuestion.source?.passageSourcePath || ""));
    const passagePageChanged = Boolean(selectedQuestion && Number(draft.passageSourcePage) !== Number(selectedQuestion.source?.passagePage || 0));
    const pageVerified = draft.sourcePageVerified && !promptChanged && !sourceFileChanged && !sourcePathChanged && !sourcePageChanged;
    const optionsVerified = draft.sourceOptionsVerified && !promptChanged && !optionsChanged && !sourceFileChanged && !sourcePathChanged && !sourcePageChanged;
    const answerSourceVerified = draft.answerSourceVerified && !answerChanged && !answerFileChanged;
    const explanationSourceVerified = draft.explanationSourceVerified && !explanationChanged && !explanationFileChanged;
    const passageSourceVerified = draft.passageSourceVerified && !passageChanged && !passageFileChanged && !passagePathChanged && !passagePageChanged;
    if (!draft.sourceFile.trim()) reviewReasons.push("来源文件未填写");
    if (!draft.sourcePath.trim()) reviewReasons.push("来源路径未填写");
    if (!(Number(draft.sourcePage) > 0)) reviewReasons.push("来源页码未填写");
    if (!pageVerified) reviewReasons.push("题干来源页待核对");
    if (options.length && !optionsVerified) reviewReasons.push("来源选项待核对");
    if (draft.answer.trim() && !draft.answerSourceFile.trim()) reviewReasons.push("答案来源文件未填写");
    if (draft.answer.trim() && !answerSourceVerified) reviewReasons.push("答案来源待核对");
    if (draft.explanation.trim() && !draft.explanationSourceFile.trim()) reviewReasons.push("解析来源文件未填写");
    if (draft.explanation.trim() && !explanationSourceVerified) reviewReasons.push("解析来源待核对");
    if (draft.passage.trim() && !draft.passageSourceFile.trim()) reviewReasons.push("阅读材料来源文件未填写");
    if (draft.passage.trim() && !(Number(draft.passageSourcePage) > 0)) reviewReasons.push("阅读材料来源页码未填写");
    if (draft.passage.trim() && !passageSourceVerified) reviewReasons.push("阅读材料原文来源待核对");
    if (!draft.answer.trim()) reviewReasons.push("标准答案缺失");
    if (!draft.explanation.trim()) reviewReasons.push("来源未提供逐题解析");
    if (draft.reviewRequired && !reviewReasons.length) reviewReasons.push("管理员标记待复核");
    const finalReviewReasons = [...new Set(reviewReasons)];
    const reviewRequired = draft.reviewRequired || finalReviewReasons.length > 0;
    const patch: Partial<ExamPrepQuestion> = {
      number: Math.max(1, Number(draft.number) || 1),
      group: draft.group.trim() || undefined,
      passageTitle: draft.passageTitle.trim() || undefined,
      passage: draft.passage.trim() || undefined,
      prompt: draft.prompt.trim(),
      options,
      answer: draft.answer.trim() || null,
      answerMode: draft.answerMode,
      responseType: draft.responseType || undefined,
      optionGroups: groupOptions(options, Math.max(0, Number(draft.optionGroupCount) || 0)),
      explanation: draft.explanation.trim(),
      reviewRequired,
      reviewReasons: reviewRequired ? finalReviewReasons : [],
      source: {
        ...selectedQuestion?.source,
        file: draft.sourceFile.trim() || undefined,
        path: draft.sourcePath.trim() || undefined,
        page: Number(draft.sourcePage) > 0 ? Number(draft.sourcePage) : undefined,
        pageVerified,
        promptVerified: pageVerified,
        optionsVerified,
        answerSourceFile: draft.answerSourceFile.trim() || undefined,
        answerSourceVerified,
        explanationSourceFile: draft.explanationSourceFile.trim() || undefined,
        explanationSourceVerified,
        passageSourceFile: draft.passageSourceFile.trim() || undefined,
        passageSourcePath: draft.passageSourcePath.trim() || undefined,
        passagePage: Number(draft.passageSourcePage) > 0 ? Number(draft.passageSourcePage) : undefined,
        passagePageVerified: passageSourceVerified,
        passageVerified: passageSourceVerified,
      },
    };
    const next: ExamPrepQuestionOverrideState = {
      overrides: { ...overrideState.overrides },
      additions: [...overrideState.additions],
    };
    const additionIndex = next.additions.findIndex((question) => question.id === id);
    if (newDraft || additionIndex >= 0) {
      const addition: ExamPrepQuestion = { ...patch, id } as ExamPrepQuestion;
      if (additionIndex >= 0) next.additions[additionIndex] = addition;
      else next.additions.push(addition);
    } else {
      next.overrides[id] = { ...next.overrides[id], deleted: false, patch: { ...next.overrides[id]?.patch, ...patch } };
    }
    if (selectedQuestion?.passageTitle && selectedQuestion.passage !== patch.passage) {
      for (const sibling of mergedQuestions) {
        if (sibling.id === id || sibling.passageTitle !== selectedQuestion.passageTitle) continue;
        const siblingIndex = next.additions.findIndex((question) => question.id === sibling.id);
        if (siblingIndex >= 0) next.additions[siblingIndex] = { ...next.additions[siblingIndex], passage: patch.passage };
        else if (sibling.id) next.overrides[sibling.id] = { ...next.overrides[sibling.id], patch: { ...next.overrides[sibling.id]?.patch, passage: patch.passage } };
      }
    }
    if (await persist(next)) {
      setNewDraft(false);
      setSelectedId(id);
    }
  }

  async function toggleDelete() {
    if (!selectedId) return;
    if (newDraft) {
      setNewDraft(false);
      setSelectedId("");
      setMessage("已取消新增。");
      return;
    }
    const next: ExamPrepQuestionOverrideState = {
      overrides: { ...overrideState.overrides },
      additions: [...overrideState.additions],
    };
    const additionIndex = next.additions.findIndex((question) => question.id === selectedId);
    if (additionIndex >= 0) next.additions.splice(additionIndex, 1);
    else next.overrides[selectedId] = { ...next.overrides[selectedId], deleted: !isDeleted };
    await persist(next);
  }

  if (!adminUserId) return null;

  return <section className="exam-prep-question-admin">
    <button className="exam-prep-admin-toggle" onClick={() => setOpen((value) => !value)} type="button">
      {open ? "收起题目管理" : "管理员：编辑题目、答案与解析"}
    </button>
    {open ? <div className="exam-prep-admin-panel">
      <div className="exam-prep-admin-toolbar">
        <label>选择题目
          <select onChange={(event) => { setSelectedId(event.target.value); setNewDraft(false); setMessage(""); }} value={newDraft ? "" : selectedId}>
            <option value="">请选择</option>
            {mergedQuestions.map((question, index) => <option key={question.id || index} value={question.id || `q-${index}`}>
              {question.id || `第 ${question.number} 题`} · {(question.prompt || question.stem || "新题").slice(0, 48)}{overrideState.overrides[question.id || ""]?.deleted ? "（已删除）" : ""}
            </option>)}
          </select>
        </label>
        <button onClick={addQuestion} type="button">新增题目</button>
      </div>
      {(selectedQuestion || newDraft) ? <div className="exam-prep-admin-form">
        <div className="exam-prep-admin-two-col">
          <label>题号<input onChange={(event) => setDraft((current) => ({ ...current, number: event.target.value }))} type="number" value={draft.number} /></label>
          <label>题组 / 篇章标签<input onChange={(event) => setDraft((current) => ({ ...current, group: event.target.value }))} value={draft.group} /></label>
        </div>
        <label>阅读材料 / Passage<textarea onChange={(event) => setDraft((current) => ({ ...current, passage: event.target.value, passageSourceVerified: false }))} rows={5} value={draft.passage} /></label>
        <div className="exam-prep-admin-two-col">
          <label>材料标题<input onChange={(event) => setDraft((current) => ({ ...current, passageTitle: event.target.value }))} value={draft.passageTitle} /></label>
          <label>作答模式<select onChange={(event) => setDraft((current) => ({ ...current, answerMode: event.target.value }))} value={draft.answerMode}><option value="choice">单选</option><option value="multi">多选</option><option value="text">文字作答</option><option value="essay">长文作答</option></select></label>
        </div>
        <label>交互类型<select onChange={(event) => setDraft((current) => ({ ...current, responseType: event.target.value }))} value={draft.responseType}><option value="">普通题目</option><option value="sentence-selection">点击原文句子</option></select></label>
        <label>题干<textarea onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value, sourcePageVerified: false, sourceOptionsVerified: false }))} rows={3} value={draft.prompt} /></label>
        <label>选项（每行“标签|选项内容”）<textarea onChange={(event) => setDraft((current) => ({ ...current, options: event.target.value, sourceOptionsVerified: false }))} rows={6} value={draft.options} /></label>
        <label>分空选项组数（0 表示普通选项）<input min="0" onChange={(event) => setDraft((current) => ({ ...current, optionGroupCount: event.target.value }))} type="number" value={draft.optionGroupCount} /></label>
        <label>答案<input onChange={(event) => setDraft((current) => ({ ...current, answer: event.target.value, answerSourceVerified: false }))} value={draft.answer} /></label>
        <label>解析<textarea onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value, explanationSourceVerified: false }))} rows={5} value={draft.explanation} /></label>
        <div className="exam-prep-admin-two-col">
          <label>题目来源文件<input onChange={(event) => setDraft((current) => ({ ...current, sourceFile: event.target.value, sourcePageVerified: false, sourceOptionsVerified: false }))} value={draft.sourceFile} /></label>
          <label>题目来源路径<input onChange={(event) => setDraft((current) => ({ ...current, sourcePath: event.target.value, sourcePageVerified: false, sourceOptionsVerified: false }))} value={draft.sourcePath} /></label>
        </div>
        <label>题目来源页码<input min="1" onChange={(event) => setDraft((current) => ({ ...current, sourcePage: event.target.value, sourcePageVerified: false, sourceOptionsVerified: false }))} type="number" value={draft.sourcePage} /></label>
        <div className="exam-prep-admin-two-col">
          <label className="exam-prep-admin-checkbox"><input checked={draft.sourcePageVerified} onChange={(event) => setDraft((current) => ({ ...current, sourcePageVerified: event.target.checked }))} type="checkbox" />题干与来源页已核对</label>
          <label className="exam-prep-admin-checkbox"><input checked={draft.sourceOptionsVerified} onChange={(event) => setDraft((current) => ({ ...current, sourceOptionsVerified: event.target.checked }))} type="checkbox" />选项与来源页已核对</label>
        </div>
        <div className="exam-prep-admin-two-col">
          <label>答案来源文件<input onChange={(event) => setDraft((current) => ({ ...current, answerSourceFile: event.target.value, answerSourceVerified: false }))} value={draft.answerSourceFile} /></label>
          <label className="exam-prep-admin-checkbox"><input checked={draft.answerSourceVerified} onChange={(event) => setDraft((current) => ({ ...current, answerSourceVerified: event.target.checked }))} type="checkbox" />答案与来源已核对</label>
        </div>
        <div className="exam-prep-admin-two-col">
          <label>解析来源文件<input onChange={(event) => setDraft((current) => ({ ...current, explanationSourceFile: event.target.value, explanationSourceVerified: false }))} value={draft.explanationSourceFile} /></label>
          <label className="exam-prep-admin-checkbox"><input checked={draft.explanationSourceVerified} onChange={(event) => setDraft((current) => ({ ...current, explanationSourceVerified: event.target.checked }))} type="checkbox" />解析与来源已核对</label>
        </div>
        {draft.passage.trim() ? <>
          <div className="exam-prep-admin-two-col">
            <label>阅读材料来源文件<input onChange={(event) => setDraft((current) => ({ ...current, passageSourceFile: event.target.value, passageSourceVerified: false }))} value={draft.passageSourceFile} /></label>
            <label>阅读材料来源路径<input onChange={(event) => setDraft((current) => ({ ...current, passageSourcePath: event.target.value, passageSourceVerified: false }))} value={draft.passageSourcePath} /></label>
          </div>
          <div className="exam-prep-admin-two-col">
            <label>阅读材料来源页码<input min="1" onChange={(event) => setDraft((current) => ({ ...current, passageSourcePage: event.target.value, passageSourceVerified: false }))} type="number" value={draft.passageSourcePage} /></label>
            <label className="exam-prep-admin-checkbox"><input checked={draft.passageSourceVerified} onChange={(event) => setDraft((current) => ({ ...current, passageSourceVerified: event.target.checked }))} type="checkbox" />阅读材料与来源页已核对</label>
          </div>
        </> : null}
        <label className="exam-prep-admin-checkbox"><input checked={draft.reviewRequired} onChange={(event) => setDraft((current) => ({ ...current, reviewRequired: event.target.checked }))} type="checkbox" />来源待复核</label>
        {draft.reviewRequired ? <label>复核原因<textarea onChange={(event) => setDraft((current) => ({ ...current, reviewReasons: event.target.value }))} rows={2} value={draft.reviewReasons} /></label> : null}
        {selectedQuestion?.source ? <small className="exam-prep-admin-source">题目来源：{selectedQuestion.source.file || selectedQuestion.source.path || "未记录"}{selectedQuestion.source.page ? ` · 第 ${selectedQuestion.source.page} 页` : ""}{selectedQuestion.source.pageVerified ? " · 题干页已核对" : " · 题干页待核对"}{selectedQuestion.source.optionsVerified ? " · 选项已核对" : " · 选项待核对"}{selectedQuestion.source.answerSourceFile ? ` · 答案：${selectedQuestion.source.answerSourceFile}${selectedQuestion.source.answerSourceVerified ? "（已核）" : "（待核）"}` : ""}{selectedQuestion.source.answerSourceRaw ? ` · 原始答案键：${selectedQuestion.source.answerSourceRaw}（暂不采纳）` : ""}{selectedQuestion.source.unpairedAnswerKey ? ` · 未编号键：${selectedQuestion.source.unpairedAnswerKey}（未配题号）` : ""}{selectedQuestion.source.explanationSourceFile ? ` · 解析：${selectedQuestion.source.explanationSourceFile}${selectedQuestion.source.explanationSourceVerified ? "（已核）" : "（待核）"}` : ""}{selectedQuestion.source.passageSourceFile ? ` · 材料：${selectedQuestion.source.passageSourceFile}${selectedQuestion.source.passagePage ? ` 第 ${selectedQuestion.source.passagePage} 页` : ""}${selectedQuestion.source.passageVerified ? "（已核）" : "（待核）"}` : ""}</small> : null}
        <div className="exam-prep-admin-actions">
          <button disabled={saving} onClick={() => void saveDraft()} type="button">{saving ? "保存中…" : "保存题目"}</button>
          {!newDraft ? <button className="danger" disabled={saving} onClick={() => void toggleDelete()} type="button">{isDeleted ? "恢复题目" : "删除题目"}</button> : <button disabled={saving} onClick={() => void toggleDelete()} type="button">取消新增</button>}
          {message ? <span aria-live="polite">{message}</span> : null}
        </div>
      </div> : <p className="senior-high-muted">选择一道题，或新增题目。删除操作可恢复。</p>}
    </div> : null}
  </section>;
}
