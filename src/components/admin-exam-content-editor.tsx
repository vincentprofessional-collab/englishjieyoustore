"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { ExamContentId, ExamContentOverride } from "@/lib/exam-content/overrides";
import { listExamContentOverrides } from "@/lib/exam-content/overrides";
import styles from "./admin-exam-content-editor.module.css";

type ExamChoice = { id: ExamContentId; title: string; indexUrl: string; root: string };
type BankEntry = {
  id: string;
  title: string;
  category?: string;
  kind?: string;
  dataPath?: string;
  source?: string;
  href?: string;
  year?: string | number;
};
type PathPart = string | number;
type QuestionCollection = { path: PathPart[]; key: string; label: string; items: unknown[]; parent: Record<string, unknown> };

const exams: ExamChoice[] = [
  { id: "cet4", title: "大学英语四级", indexUrl: "/cet4/index.json", root: "/cet4" },
  { id: "cet6", title: "大学英语六级", indexUrl: "/cet6/index.json", root: "/cet6" },
  { id: "postgraduate", title: "考研英语", indexUrl: "/exam-prep/postgraduate/index.json", root: "/exam-prep/postgraduate" },
  { id: "ielts", title: "雅思阅读", indexUrl: "/api/exam-content/ielts", root: "/api/exam-content/ielts" },
  { id: "gre", title: "GRE", indexUrl: "/exam-prep/gre/index.json", root: "/exam-prep/gre" },
  { id: "gmat", title: "GMAT", indexUrl: "/exam-prep/gmat/index.json", root: "/exam-prep/gmat" },
  { id: "sat", title: "SAT", indexUrl: "/sat/index.json", root: "/sat/sets" },
];

function contentUrl(exam: ExamChoice, entry: BankEntry) {
  if (exam.id === "ielts") return exam.root + "/" + encodeURIComponent(entry.id);
  if (exam.id === "cet4" || exam.id === "cet6") {
    const kind = entry.kind === "paper" ? "papers" : "practice";
    return exam.root + "/" + kind + "/" + encodeURIComponent(entry.id) + ".json";
  }
  if (!entry.dataPath) throw new Error("题库目录缺少数据文件路径。");
  return exam.root + "/" + entry.dataPath.split("/").map(encodeURIComponent).join("/");
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请重试。";
}

function emptyQuestion(exam: ExamContentId, id: string, number: number, parent: Record<string, unknown> = {}) {
  if (exam === "sat") return {
    id,
    assessment: "SAT",
    test: "Reading and Writing",
    domain: String(parent.domain || "Standard English Conventions"),
    skill: String(parent.skill || "新增专题"),
    difficulty: "Unrated",
    contentBlocks: [{ type: "paragraph", text: "请编辑材料内容。" }],
    prompt: "请编辑题目内容。",
    choices: [{ id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }],
    correctAnswer: "A",
    rationale: "",
    sourceRefs: [],
    reviewStatus: "review_required",
    reviewFlags: ["新建题目，答案和解析待复核。"],
  };
  if (exam === "cet4" || exam === "cet6") return {
    id,
    displayNumber: number,
    typeLabel: "简答题",
    type: "short_answer",
    promptBlocks: [{ type: "paragraph", runs: [{ type: "text", text: "请编辑题目内容。" }] }],
    placement: { kind: "standalone" },
    options: [],
    blanks: [],
    answerSpec: { availability: "none", gradingMode: "manual", kind: "text" },
    explanationBlocks: [],
    sourceRefs: [],
    reviewStatus: "approved",
  };
  if (exam === "ielts" && parent.type === "fill") return { number, before: "请编辑题目内容。", after: "", answer: "" };
  if (exam === "ielts") return {
    questionNumbers: [number],
    prompt: "请编辑题目内容。",
    options: [{ letter: "A", text: "" }, { letter: "B", text: "" }, { letter: "C", text: "" }, { letter: "D", text: "" }],
    answer: "",
  };
  return { id, number, group: "", passage: "", prompt: "请编辑题目内容。", options: [], answer: "", answerMode: "text", explanation: "" };
}

function emptyBank(exam: ExamContentId, entry: BankEntry) {
  const title = entry.title || entry.id;
  const category = entry.category || "综合练习";
  const kind = entry.kind === "paper" ? "paper" : "practice";
  const firstQuestion = emptyQuestion(exam, entry.id + "-q1", 1);
  if (exam === "cet4" || exam === "cet6") return {
    schemaVersion: 2,
    id: entry.id,
    kind,
    title,
    year: String(entry.year || ""),
    region: "全国",
    variant: "",
    instructions: [],
    sections: [{ id: "section-1", title: title, layout: "flow", instructions: [], groups: [{ id: "group-1", title: category, instructions: [], stimulusBlocks: [], sharedOptions: [], questions: [firstQuestion] }] }],
    assetRefs: [],
    sourceRefs: [],
    quality: { structureStatus: "approved", structureConfidence: 1, issueCount: 0, issues: [] },
  };
  if (exam === "ielts") return {
    id: entry.id,
    bookCode: "custom-" + entry.id,
    bookTitle: category,
    testNo: 1,
    title,
    parts: [{
      id: "part-1",
      label: "Passage 1",
      title: "Passage 1",
      intro: "",
      questionRange: "1-1",
      sections: [{ id: "section-1", paragraphs: ["请在此输入阅读文章。"] }],
      questionBlocks: [{ id: "block-1", type: "choice", instruction: "Choose the correct answer.", questions: [{ questionNumbers: [1], prompt: "请编辑题目内容。", options: [{ letter: "A", text: "" }, { letter: "B", text: "" }, { letter: "C", text: "" }, { letter: "D", text: "" }], answer: "" }] }],
    }],
  };
  if (exam === "sat") return {
    id: entry.id,
    assessment: "SAT",
    test: "Reading and Writing",
    domain: category,
    skill: title,
    difficulty: "Unrated",
    expectedCount: 1,
    questionIds: [firstQuestion.id],
    sourceRefs: [],
    questions: [firstQuestion],
  };
  const base = { id: entry.id, exam, title, category, kind, source: "管理员新增", questionCount: 1, answerCount: 0, reviewCount: 0 };
  if (exam === "postgraduate" && kind === "paper") return {
    ...base,
    year: Number(entry.year) || new Date().getFullYear(),
    subject: "英语一",
    mode: "practice",
    sections: [{ title: "题目", kind: "questions", directions: "", questions: [firstQuestion] }],
  };
  return { ...base, questions: [firstQuestion] };
}

function collectQuestionCollections(value: unknown, path: PathPart[] = []): QuestionCollection[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const result: QuestionCollection[] = [];
  for (const [key, child] of Object.entries(record)) {
    const childPath = [...path, key];
    if (key === "questions" && Array.isArray(child)) {
      const label = childPath.map((part) => typeof part === "number" ? "[" + part + "]" : (typeof part === "string" && /^\\d+$/.test(part) ? "[" + part + "]" : (childPath.indexOf(part) ? "." : "") + part)).join("");
      result.push({ path: childPath, key: JSON.stringify(childPath), label, items: child, parent: record });
    }
    if (child && typeof child === "object") {
      if (Array.isArray(child)) child.forEach((item, index) => result.push(...collectQuestionCollections(item, [...childPath, index])));
      else result.push(...collectQuestionCollections(child, childPath));
    }
  }
  return result;
}

function atPath(root: unknown, path: PathPart[]): unknown {
  return path.reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string | number, unknown>)[part] : undefined, root);
}

function updateAtPath(root: Record<string, unknown>, path: PathPart[], update: (value: unknown) => unknown) {
  const clone = JSON.parse(JSON.stringify(root)) as Record<string, unknown>;
  const parent = atPath(clone, path.slice(0, -1)) as Record<string | number, unknown>;
  const last = path.at(-1);
  if (!parent || last === undefined) throw new Error("题目位置无效。");
  parent[last] = update(parent[last]);
  return clone;
}

function questionNumber(question: unknown, fallback: number) {
  if (!question || typeof question !== "object") return fallback;
  const row = question as Record<string, unknown>;
  if (typeof row.number === "number") return row.number;
  if (typeof row.displayNumber === "number") return row.displayNumber;
  if (Array.isArray(row.questionNumbers) && typeof row.questionNumbers[0] === "number") return row.questionNumbers[0];
  return fallback;
}

function questionLabel(question: unknown, index: number) {
  if (!question || typeof question !== "object") return "第 " + (index + 1) + " 项";
  const row = question as Record<string, unknown>;
  const label = row.id || row.number || row.displayNumber || (Array.isArray(row.questionNumbers) ? row.questionNumbers.join("、") : null) || "第 " + (index + 1) + " 题";
  const title = row.prompt || row.stem || row.before;
  return String(label) + (typeof title === "string" && title ? " · " + title.slice(0, 48).replace(/\\s+/g, " ") : "");
}

function freshQuestion(exam: ExamContentId, entry: BankEntry, collection: QuestionCollection) {
  const sample = collection.items.find((item) => item && typeof item === "object" && !Array.isArray(item));
  const number = Math.max(0, ...collection.items.map((item, index) => questionNumber(item, index + 1))) + 1;
  if (!sample) return emptyQuestion(exam, entry.id + "-q" + number, number, collection.parent);
  const copy = JSON.parse(JSON.stringify(sample)) as Record<string, unknown>;
  if (typeof copy.id === "string") copy.id = entry.id + "-q" + number;
  if (typeof copy.number === "number") copy.number = number;
  if (typeof copy.displayNumber === "number") copy.displayNumber = number;
  if (Array.isArray(copy.questionNumbers)) copy.questionNumbers = [number];
  if (typeof copy.prompt === "string") copy.prompt = "请编辑题目内容。";
  if (typeof copy.stem === "string") copy.stem = "请编辑题目内容。";
  if (typeof copy.before === "string") copy.before = "请编辑题目内容。";
  if (typeof copy.after === "string") copy.after = "";
  if (typeof copy.answer === "string" || Array.isArray(copy.answer)) copy.answer = "";
  if (copy.answerSpec && typeof copy.answerSpec === "object") copy.answerSpec = { ...(copy.answerSpec as Record<string, unknown>), availability: "none", acceptedAnswers: [], perBlankAnswers: {}, referenceAnswer: undefined };
  if (Array.isArray(copy.promptBlocks)) copy.promptBlocks = [{ type: "paragraph", runs: [{ type: "text", text: "请编辑题目内容。" }] }];
  if (Array.isArray(copy.options) && copy.options.length === 0 && exam === "ielts") copy.options = [{ letter: "A", text: "" }, { letter: "B", text: "" }, { letter: "C", text: "" }, { letter: "D", text: "" }];
  return copy;
}

export function AdminExamContentEditor({ adminUserId }: { adminUserId: string }) {
  const [examId, setExamId] = useState<ExamContentId>("cet4");
  const exam = useMemo(() => exams.find((item) => item.id === examId) || exams[0], [examId]);
  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [bankId, setBankId] = useState("");
  const [draftEntry, setDraftEntry] = useState<BankEntry | null>(null);
  const [showNewBankForm, setShowNewBankForm] = useState(false);
  const [newBankId, setNewBankId] = useState("");
  const [newBankTitle, setNewBankTitle] = useState("");
  const [newBankCategory, setNewBankCategory] = useState("");
  const [newBankYear, setNewBankYear] = useState("");
  const [newBankKind, setNewBankKind] = useState("paper");
  const [editorText, setEditorText] = useState("");
  const [overrides, setOverrides] = useState<ExamContentOverride[]>([]);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [collectionKey, setCollectionKey] = useState("");
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [questionText, setQuestionText] = useState("");
  const [questionDirty, setQuestionDirty] = useState(false);

  const entry = useMemo(() => entries.find((item) => item.id === bankId) || (draftEntry?.id === bankId ? draftEntry : null), [bankId, draftEntry, entries]);
  const override = overrides.find((item) => item.bank_id === bankId) ?? null;
  const questionCollections = useMemo(() => {
    try { return collectQuestionCollections(JSON.parse(editorText)); } catch { return []; }
  }, [editorText]);
  const selectedCollection = questionCollections.find((item) => item.key === collectionKey) ?? null;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setEntries([]);
    setBankId("");
    setDraftEntry(null);
    setEditorText("");
    setOverrides([]);
    setIsDirty(false);
    setQuestionDirty(false);
    setCollectionKey("");
    setQuestionIndex(-1);
    setMessage("");
    async function loadIndex() {
      try {
        const response = await fetch(exam.indexUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("题库目录读取失败。");
        const result = await response.json() as { entries?: BankEntry[]; sets?: Array<Record<string, unknown>> };
        if (cancelled) return;
        let staticEntries = Array.isArray(result.entries) ? result.entries : [];
        if (exam.id === "sat") {
          const [knowledgeResponse] = await Promise.all([fetch("/sat/knowledge.json", { cache: "no-store" })]);
          if (!knowledgeResponse.ok) throw new Error("SAT 知识点目录读取失败。");
          const knowledge = await knowledgeResponse.json() as { groups?: Array<{ label?: string; topics?: Array<{ setId: string; title?: string; label?: string }> }> };
          const catalogEntries = (Array.isArray(result.sets) ? result.sets : []).map((set) => ({
            id: String(set.id || ""), title: String(set.skill || set.title || set.id || ""),
            category: String(set.domain || "SAT"), kind: "practice", dataPath: `${String(set.id || "")}.json`,
          })).filter((item) => item.id);
          const knowledgeEntries = (knowledge.groups || []).flatMap((group) => (group.topics || []).map((topic) => ({
            id: topic.setId, title: topic.title || topic.label || topic.setId,
            category: group.label || "Standard English Conventions", kind: "practice", dataPath: `${topic.setId}.json`,
          })));
          const byId = new Map<string, BankEntry>();
          for (const item of [...catalogEntries, ...knowledgeEntries]) byId.set(item.id, item);
          staticEntries = [...byId.values()];
        }
        setEntries(staticEntries);
        setBankId(staticEntries[0]?.id || "");
        const { overrides: rows, error } = await listExamContentOverrides(exam.id);
        if (cancelled) return;
        if (error) {
          setMessage("无法读取持久化题库。请检查 exam_prep_banks 数据库表和管理员权限。");
          return;
        }
        setOverrides(rows);
        const ids = new Set(staticEntries.map((item) => item.id));
        const dynamicEntries: BankEntry[] = [];
        for (const row of rows) {
          if (ids.has(row.bank_id)) continue;
          const data = row.bank_data as Record<string, unknown> | null;
          dynamicEntries.push({
            id: row.bank_id,
            title: row.title || row.bank_id,
            category: row.category || "",
            source: row.source || "",
            kind: typeof data?.kind === "string" ? data.kind : (exam.id === "ielts" ? "paper" : "practice"),
            year: typeof data?.year === "string" || typeof data?.year === "number" ? data.year : "",
          });
        }
        const allEntries = [...staticEntries, ...dynamicEntries];
        setEntries(allEntries);
        setBankId(allEntries[0]?.id || "");
      } catch (error) {
        if (!cancelled) setMessage(errorText(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadIndex();
    return () => { cancelled = true; };
  }, [exam]);

  useEffect(() => {
    if (!entry) return;
    const selectedEntry = entry as BankEntry;
    let cancelled = false;
    setIsLoading(true);
    setIsDirty(false);
    setQuestionDirty(false);
    setCollectionKey("");
    setQuestionIndex(-1);
    setQuestionText("");
    async function loadBank() {
      try {
        if (draftEntry?.id === selectedEntry.id) {
          setEditorText(JSON.stringify(emptyBank(exam.id, selectedEntry), null, 2));
          setIsDeleted(false);
          setIsDirty(true);
          setMessage("新建内容尚未发布。保存后学生页面即可访问。");
          return;
        }
        const { data: saved, error } = await supabase
          .from("exam_prep_banks")
          .select("bank_id,title,category,source,bank_data,is_deleted,updated_at")
          .eq("exam", exam.id)
          .eq("bank_id", selectedEntry.id)
          .eq("status", "published")
          .maybeSingle();
        if (cancelled) return;
        if (error) throw new Error("持久化题库读取失败：" + error.message);
        const current = saved as ExamContentOverride | null;
        if (current?.bank_data) {
          setEditorText(JSON.stringify(current.bank_data, null, 2));
          setIsDeleted(Boolean(current.is_deleted));
          setMessage(current.is_deleted ? "这套内容已从学生页面删除。可保存编辑内容以重新发布。" : "正在编辑已发布内容。");
          return;
        }
        if (selectedEntry.dataPath || exam.id === "cet4" || exam.id === "cet6" || exam.id === "ielts") {
          const response = await fetch(contentUrl(exam, selectedEntry), { cache: "no-store" });
          if (response.ok) {
            const baseData = await response.json() as Record<string, unknown>;
            if (!cancelled) {
              setEditorText(JSON.stringify(baseData, null, 2));
              setIsDeleted(Boolean(current?.is_deleted));
              setMessage(current?.is_deleted ? "这套内容已从学生页面删除。编辑并保存可重新发布。" : "正在编辑网站当前内容。");
            }
            return;
          }
        }
        const fallbackEntry = { ...selectedEntry, title: current?.title || selectedEntry.title, category: current?.category || selectedEntry.category };
        setEditorText(JSON.stringify(emptyBank(exam.id, fallbackEntry), null, 2));
        setIsDeleted(Boolean(current?.is_deleted));
        setMessage(current?.is_deleted ? "这套自定义内容已删除；编辑后保存可重新发布。" : "新建内容尚未发布。保存后学生页面即可访问。");
      } catch (error) {
        if (!cancelled) setMessage(errorText(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadBank();
    return () => { cancelled = true; };
  }, [draftEntry, entry, exam]);

  function changeExam(nextExam: ExamContentId) {
    if ((isDirty || questionDirty) && !window.confirm("切换考试会丢弃未保存的修改，继续吗？")) return;
    setDraftEntry(null);
    setShowNewBankForm(false);
    setExamId(nextExam);
  }

  function changeBank(nextId: string) {
    if ((isDirty || questionDirty) && !window.confirm("切换题库会丢弃未保存的修改，继续吗？")) return;
    setDraftEntry(null);
    setBankId(nextId);
  }

  function startNewBank() {
    if ((isDirty || questionDirty) && !window.confirm("开始新建内容会丢弃当前未保存的修改，继续吗？")) return;
    setDraftEntry(null);
    setShowNewBankForm(true);
    setNewBankId("");
    setNewBankTitle("");
    setNewBankCategory("");
    setNewBankYear("");
    setNewBankKind(exam.id === "ielts" ? "paper" : "paper");
    setMessage("");
  }

  function createBankDraft() {
    const id = newBankId.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/.test(id)) {
      setMessage("题库 ID 仅支持英文、数字、点、短横线和下划线，长度不超过 160 个字符。");
      return;
    }
    if (entries.some((item) => item.id === id)) {
      setMessage("这个 ID 已存在，请换一个。");
      return;
    }
    const next: BankEntry = { id, title: newBankTitle.trim() || id, category: newBankCategory.trim() || "综合练习", kind: exam.id === "ielts" ? "paper" : newBankKind, year: newBankYear.trim() };
    setDraftEntry(next);
    setBankId(id);
    setShowNewBankForm(false);
    setMessage("");
  }

  function setQuestionCollection(nextKey: string) {
    if (questionDirty && !window.confirm("切换题目集合会丢弃未应用的单题修改，继续吗？")) return;
    const next = questionCollections.find((item) => item.key === nextKey) ?? null;
    setCollectionKey(nextKey);
    setQuestionIndex(next?.items.length ? 0 : -1);
    setQuestionText(next?.items.length ? JSON.stringify(next.items[0], null, 2) : next && entry ? JSON.stringify(emptyQuestion(exam.id, entry.id + "-q1", 1, next.parent), null, 2) : "");
    setQuestionDirty(false);
  }

  function setSelectedQuestion(nextIndex: number) {
    if (questionDirty && !window.confirm("切换题目会丢弃未应用的单题修改，继续吗？")) return;
    setQuestionIndex(nextIndex);
    const question = selectedCollection?.items[nextIndex];
    setQuestionText(question === undefined ? "" : JSON.stringify(question, null, 2));
    setQuestionDirty(false);
  }

  function addQuestion() {
    if (!entry || !selectedCollection) return;
    try {
      const parsed: unknown = JSON.parse(questionText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("单题内容必须是 JSON 对象。");
      const next = updateAtPath(JSON.parse(editorText) as Record<string, unknown>, selectedCollection.path, (value) => [...(Array.isArray(value) ? value : []), parsed]);
      setEditorText(JSON.stringify(next, null, 2));
      setQuestionIndex(selectedCollection.items.length);
      setQuestionText(JSON.stringify(parsed, null, 2));
      setQuestionDirty(false);
      setIsDirty(true);
      setMessage("题目已加入试卷草稿；点击“保存并发布”后学生端生效。");
    } catch (error) { setMessage(errorText(error)); }
  }

  function updateQuestion() {
    if (!entry || !selectedCollection || questionIndex < 0) return;
    try {
      const parsed: unknown = JSON.parse(questionText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("单题内容必须是 JSON 对象。");
      const next = updateAtPath(JSON.parse(editorText) as Record<string, unknown>, selectedCollection.path, (value) => (value as unknown[]).map((item, index) => index === questionIndex ? parsed : item));
      setEditorText(JSON.stringify(next, null, 2));
      setQuestionText(JSON.stringify(parsed, null, 2));
      setQuestionDirty(false);
      setIsDirty(true);
      setMessage("单题修改已应用到试卷草稿；点击“保存并发布”后学生端生效。");
    } catch (error) { setMessage(errorText(error)); }
  }

  function deleteQuestion() {
    if (!entry || !selectedCollection || questionIndex < 0 || !window.confirm("删除所选题目？保存并发布后学生端将不再显示这道题。")) return;
    const nextItems = selectedCollection.items.filter((_, index) => index !== questionIndex);
    const next = updateAtPath(JSON.parse(editorText) as Record<string, unknown>, selectedCollection.path, () => nextItems);
    setEditorText(JSON.stringify(next, null, 2));
    const nextIndex = Math.min(questionIndex, nextItems.length - 1);
    setQuestionIndex(nextIndex);
    setQuestionText(nextIndex >= 0 ? JSON.stringify(nextItems[nextIndex], null, 2) : "");
    setQuestionDirty(false);
    setIsDirty(true);
    setMessage("题目已从试卷草稿删除；点击“保存并发布”后学生端生效。");
  }

  async function saveContent() {
    if (!entry) return;
    if (questionDirty) {
      setMessage("先点击“应用单题修改”或放弃单题编辑，再保存整套内容。");
      return;
    }
    let content: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(editorText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("题目内容必须是 JSON 对象。");
      content = parsed as Record<string, unknown>;
      if (content.id !== entry.id) throw new Error("题目 ID 必须与所选题库一致，不能改成另一套题库的 ID。");
      if (new Blob([editorText]).size > 4_000_000) throw new Error("单套题库超过 4 MB，暂不能保存。");
    } catch (error) {
      setMessage(errorText(error));
      return;
    }
    setIsSaving(true);
    setMessage("");
    const title = typeof content.title === "string" ? content.title : entry.title;
    const category = typeof content.category === "string" ? content.category : entry.category || "";
    const source = typeof content.source === "string" ? content.source : entry.source || "管理员新增";
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from("exam_prep_banks").upsert({
      exam: exam.id,
      bank_id: entry.id,
      status: "published",
      title,
      category,
      source,
      bank_data: content,
      is_deleted: false,
      updated_by: adminUserId,
      updated_at: updatedAt,
    }, { onConflict: "exam,bank_id,status" });
    setIsSaving(false);
    if (error) {
      setMessage("保存失败：" + error.message);
      return;
    }
    setIsDeleted(false);
    setIsDirty(false);
    setDraftEntry(null);
    setEntries((current) => {
      const savedEntry: BankEntry = { ...entry, title, category, kind: typeof content.kind === "string" ? content.kind : entry.kind, source };
      return current.some((item) => item.id === entry.id) ? current.map((item) => item.id === entry.id ? savedEntry : item) : [...current, savedEntry];
    });
    setOverrides((current) => [
      ...current.filter((item) => item.bank_id !== entry.id),
      { bank_id: entry.id, title, category, source, bank_data: content, is_deleted: false, updated_at: updatedAt },
    ]);
    setMessage("已保存并发布；学生端刷新页面后会读取这份内容。");
  }

  async function deleteContent() {
    if (!entry || !window.confirm("删除后学生将无法从题库目录进入这套内容。继续删除吗？")) return;
    setIsSaving(true);
    setMessage("");
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from("exam_prep_banks").upsert({
      exam: exam.id,
      bank_id: entry.id,
      status: "published",
      title: entry.title,
      category: entry.category || "",
      source: entry.source || "",
      bank_data: null,
      is_deleted: true,
      updated_by: adminUserId,
      updated_at: updatedAt,
    }, { onConflict: "exam,bank_id,status" });
    setIsSaving(false);
    if (error) {
      setMessage("删除失败：" + error.message);
      return;
    }
    setIsDeleted(true);
    setIsDirty(false);
    setDraftEntry(null);
    setEntries((current) => current.some((item) => item.id === entry.id) ? current : [...current, entry]);
    setOverrides((current) => [
      ...current.filter((item) => item.bank_id !== entry.id),
      { bank_id: entry.id, title: entry.title, category: entry.category || "", source: entry.source || "", bank_data: null, is_deleted: true, updated_at: updatedAt },
    ]);
    setMessage("已从学生题库目录删除。");
  }

  return <section className={"admin-editor-card " + styles.editor}>
    <header className={styles.heading}>
      <div><span className="eyebrow">EXAM CONTENT</span><h2>考试题库内容管理</h2><p>支持新增试卷／题库、增删改单题、编辑整套内容及删除整套内容；发布后学生页面刷新即可读取。</p></div>
      {entry ? <strong>{overrides.length} 套已保存的管理记录</strong> : null}
    </header>
    <div className={styles.actions}><button className="button secondary" disabled={isLoading || isSaving} onClick={startNewBank} type="button">新增试卷／题库</button></div>
    {showNewBankForm ? <div className={styles.newBankForm}>
      <label>题库 ID<input onChange={(event) => setNewBankId(event.target.value)} placeholder="例如 cet4-paper-2027-1" value={newBankId} /></label>
      <label>试卷／题库名称<input onChange={(event) => setNewBankTitle(event.target.value)} placeholder="输入显示名称" value={newBankTitle} /></label>
      <label>题型／分类<input onChange={(event) => setNewBankCategory(event.target.value)} placeholder="例如 阅读理解、定量推理" value={newBankCategory} /></label>
      {exam.id !== "ielts" ? <label>内容类型<select onChange={(event) => setNewBankKind(event.target.value)} value={newBankKind}><option value="paper">试卷</option><option value="practice">题型练习</option></select></label> : null}
      {(exam.id === "cet4" || exam.id === "cet6" || exam.id === "postgraduate") ? <label>年份<input onChange={(event) => setNewBankYear(event.target.value)} placeholder="可选" value={newBankYear} /></label> : null}
      <div className={styles.actions}><button className="button primary" onClick={createBankDraft} type="button">创建草稿</button><button className="button secondary" onClick={() => setShowNewBankForm(false)} type="button">取消</button></div>
    </div> : null}
    <div className={styles.controls}>
      <label>考试类型<select onChange={(event) => changeExam(event.target.value as ExamContentId)} value={examId}>{exams.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>题库／试卷<select disabled={!entries.length} onChange={(event) => changeBank(event.target.value)} value={bankId}>{entries.map((item) => <option key={item.id} value={item.id}>{item.title}{overrides.find((row) => row.bank_id === item.id)?.is_deleted ? "（已删除）" : ""}</option>)}</select></label>
    </div>
    {entry ? <p className={styles.help}>ID：{entry.id}{override?.updated_at ? " · 最近更新：" + new Date(override.updated_at).toLocaleString() : ""}{isDeleted ? <span className={styles.deleted}>学生端已删除</span> : null}</p> : null}
    {message ? <p className={styles.message} role="status">{message}</p> : null}
    {isLoading ? <p>正在载入题库内容…</p> : entry ? <>
      <section className={styles.questionTools} aria-label="单题管理">
        <h3>单题管理</h3>
        <p>选择题目集合后，可单独添加、修改或删除题目。单题内容使用 JSON，适配不同题型的题干、选项、答案与解析字段。</p>
        <div className={styles.questionControls}>
          <label>题目所在分组<select onChange={(event) => setQuestionCollection(event.target.value)} value={collectionKey}><option value="">选择题目分组</option>{questionCollections.map((item) => <option key={item.key} value={item.key}>{item.label}（{item.items.length} 题）</option>)}</select></label>
          <label>选择题目<select disabled={!selectedCollection?.items.length} onChange={(event) => setSelectedQuestion(Number(event.target.value))} value={questionIndex >= 0 ? String(questionIndex) : ""}><option value="">选择题目</option>{(selectedCollection?.items || []).map((item, index) => <option key={index} value={index}>{questionLabel(item, index)}</option>)}</select></label>
        </div>
        {selectedCollection ? <>
          <label htmlFor="exam-single-question-json">单题 JSON</label>
          <textarea aria-label="单题 JSON" className={styles.questionEditor} id="exam-single-question-json" onChange={(event) => { setQuestionText(event.target.value); setQuestionDirty(true); }} spellCheck={false} value={questionText} />
          <div className={styles.actions}>
            {questionIndex >= 0 ? <button className="button primary" disabled={isSaving || !questionDirty} onClick={updateQuestion} type="button">应用单题修改</button> : <button className="button primary" disabled={isSaving || !questionText.trim()} onClick={addQuestion} type="button">添加题目</button>}
            {questionIndex >= 0 ? <button className={"button secondary " + styles.danger} disabled={isSaving} onClick={deleteQuestion} type="button">删除所选题目</button> : null}
            {selectedCollection.items.length > 0 ? <button className="button secondary" disabled={isSaving} onClick={() => { if (questionDirty && !window.confirm("准备新增会丢弃未应用的单题修改，继续吗？")) return; setQuestionIndex(-1); setQuestionText(JSON.stringify(freshQuestion(exam.id, entry, selectedCollection), null, 2)); setQuestionDirty(false); }} type="button">准备新增题目</button> : null}
          </div>
        </> : <p className={styles.help}>当前内容中没有可直接选择的 questions 数组；可在下方完整 JSON 编辑器中管理其他结构。</p>}
      </section>
      <label htmlFor="exam-content-json">完整内容 JSON</label>
      <textarea aria-label="完整题库内容 JSON" className={styles.jsonEditor} id="exam-content-json" onChange={(event) => { setEditorText(event.target.value); setIsDirty(true); }} spellCheck={false} value={editorText} />
      <div className={styles.actions}>
        <button className="button primary" disabled={isSaving || (!isDirty && !questionDirty)} onClick={() => void saveContent()} type="button">{isSaving ? "保存中…" : "保存并发布"}</button>
        <button className={"button secondary " + styles.danger} disabled={isSaving || isDeleted} onClick={() => void deleteContent()} type="button">删除整套内容</button>
      </div>
    </> : <p>当前考试没有可管理的题库项目。</p>}
  </section>;
}
