"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "./admin-exam-prep-editor.module.css";

type QuestionOption = { label: string; text: string };
type QuestionTable = { headers: string[]; rows: string[][] };
type ExamQuestion = {
  id?: string; number: number; label?: string; prompt?: string; passage?: string; passageTitle?: string;
  options?: QuestionOption[]; answer?: string | null; answerMode?: string; explanation?: string;
  reviewRequired?: boolean; reviewNote?: string; table?: QuestionTable; source?: { file?: string; page?: number };
};
type ExamBank = {
  id: string; exam: "gmat"; title: string; category: string; kind: string; source: string;
  questionCount: number; answerCount: number; reviewCount: number; questions: ExamQuestion[];
};
type BankEntry = { id: string; title: string; category: string; kind: string; source: string; dataPath: string };
type BankStatus = "draft" | "published";

function isQuestionTable(value: unknown): value is QuestionTable {
  if (!value || typeof value !== "object") return false;
  const table = value as QuestionTable;
  return Array.isArray(table.headers) && table.headers.every((cell) => typeof cell === "string")
    && Array.isArray(table.rows) && table.rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"));
}

export function AdminExamPrepEditor({ adminUserId }: { adminUserId: string }) {
  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [bankId, setBankId] = useState("");
  const [bank, setBank] = useState<ExamBank | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<"static" | BankStatus>("static");
  const [tableText, setTableText] = useState("");
  const [message, setMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const entry = entries.find((item) => item.id === bankId);
  const question = bank?.questions[selectedIndex];
  const questionOptions = question?.options || [];
  const reviewCount = bank?.questions.filter((item) => item.reviewRequired).length || 0;

  useEffect(() => {
    let cancelled = false;
    fetch("/exam-prep/gmat/index.json").then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }).then((index: { entries?: BankEntry[] }) => {
      if (cancelled) return;
      const nextEntries = (index.entries || []).filter((item) => item.kind === "practice");
      setEntries(nextEntries);
      setBankId((current) => current || nextEntries[0]?.id || "");
    }).catch(() => {
      if (!cancelled) setMessage("题库目录暂时无法载入。");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!entry) return;
    const currentEntry = entry;
    let cancelled = false;
    async function loadBank() {
      setIsLoading(true);
      setMessage("");
      setIsDirty(false);
      try {
        const [draftResult, publishedResult] = await Promise.all([
          supabase.from("exam_prep_banks").select("bank_data").eq("exam", "gmat").eq("bank_id", currentEntry.id).eq("status", "draft").maybeSingle(),
          supabase.from("exam_prep_banks").select("bank_data").eq("exam", "gmat").eq("bank_id", currentEntry.id).eq("status", "published").maybeSingle(),
        ]);
        if (cancelled) return;
        const saved = draftResult.data?.bank_data ? { data: draftResult.data.bank_data as ExamBank, status: "draft" as const }
          : publishedResult.data?.bank_data ? { data: publishedResult.data.bank_data as ExamBank, status: "published" as const }
          : null;
        if (saved) {
          setBank(saved.data);
          setSourceStatus(saved.status);
          setSelectedIndex(0);
          return;
        }
        const response = await fetch(`/exam-prep/gmat/${currentEntry.dataPath}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const staticBank = await response.json() as ExamBank;
        if (cancelled) return;
        setBank(staticBank);
        setSourceStatus("static");
        setSelectedIndex(0);
        if (draftResult.error || publishedResult.error) {
          setMessage("正在显示静态题库。要保存管理改动，请先执行 supabase/035_exam_content_banks.sql。");
        }
      } catch {
        if (!cancelled) setMessage("题库内容读取失败，请检查网络与 Supabase 配置。");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadBank();
    return () => { cancelled = true; };
  }, [entry]);

  useEffect(() => {
    setTableText(question?.table ? JSON.stringify(question.table, null, 2) : "");
  }, [bank?.id, question?.table, selectedIndex]);

  function updateQuestion(patch: Partial<ExamQuestion>) {
    setBank((current) => current ? {
      ...current,
      questions: current.questions.map((item, index) => index === selectedIndex ? { ...item, ...patch } : item),
    } : current);
    setIsDirty(true);
    setMessage("");
  }

  function updateOption(optionIndex: number, patch: Partial<QuestionOption>) {
    updateQuestion({ options: questionOptions.map((option, index) => index === optionIndex ? { ...option, ...patch } : option) });
  }

  function addQuestion() {
    if (!bank) return;
    const number = Math.max(0, ...bank.questions.map((item) => item.number)) + 1;
    const next: ExamQuestion = {
      id: `${bank.id}-q${number}`, number, prompt: "", options: [], answerMode: "choice", answer: null,
      explanation: "", reviewRequired: true, reviewNote: "新增题目待录入并对照原始来源。",
      source: { file: bank.source },
    };
    setBank({ ...bank, questions: [...bank.questions, next] });
    setSelectedIndex(bank.questions.length);
    setTableText("");
    setIsDirty(true);
    setMessage("已新增待核题目。填写来源页和题面后保存。");
  }

  function deleteQuestion() {
    if (!bank || !question) return;
    const questions = bank.questions.filter((_, index) => index !== selectedIndex);
    setBank({ ...bank, questions });
    setSelectedIndex(Math.max(0, Math.min(selectedIndex, questions.length - 1)));
    setIsDirty(true);
    setMessage("已从当前草稿移除题目；保存或发布后生效。");
  }

  async function saveBank(status: BankStatus) {
    if (!bank) return;
    let table: QuestionTable | undefined;
    if (tableText.trim()) {
      try {
        const parsed: unknown = JSON.parse(tableText);
        if (!isQuestionTable(parsed) || !parsed.headers.length) throw new Error("invalid table");
        table = parsed;
      } catch {
        setMessage("表格必须是含 headers 与 rows 的 JSON，且每个单元格都用文字填写。");
        return;
      }
    }
    const questions = bank.questions.map((item, index) => index === selectedIndex
      ? { ...item, table }
      : item);
    const numbers = questions.map((item) => item.number);
    if (numbers.some((number) => !Number.isInteger(number) || number < 1) || new Set(numbers).size !== numbers.length) {
      setMessage("题号必须是大于 0 的唯一整数。");
      return;
    }
    if (status === "published" && questions.some((item) => !(item.prompt || "").trim())) {
      setMessage("发布前请为每道题填写题干；无法确认的内容可保留待核标记。");
      return;
    }
    const content: ExamBank = {
      ...bank,
      questions,
      questionCount: questions.length,
      answerCount: questions.filter((item) => Boolean(item.answer)).length,
      reviewCount: questions.filter((item) => item.reviewRequired).length,
    };
    setIsSaving(true);
    setMessage("");
    const { error } = await supabase.from("exam_prep_banks").upsert({
      exam: "gmat", bank_id: content.id, status, title: content.title, category: content.category,
      source: content.source, bank_data: content, updated_by: adminUserId, updated_at: new Date().toISOString(),
    }, { onConflict: "exam,bank_id,status" });
    setIsSaving(false);
    if (error) {
      setMessage(`保存失败：${error.message}`);
      return;
    }
    setBank(content);
    setSourceStatus(status);
    setIsDirty(false);
    setMessage(status === "published" ? "题库已发布，题目页面会读取这份内容。" : "草稿已保存，学生页面仍显示已发布版本。");
  }

  function changeBank(nextId: string) {
    if (isDirty && !window.confirm("切换题库会丢弃尚未保存的改动，继续吗？")) return;
    setBankId(nextId);
  }

  if (isLoading && !bank) return <section className={`admin-editor-card ${styles.editor}`}><p>正在载入 GMAT 题库…</p></section>;

  return <section className={`admin-editor-card ${styles.editor}`}>
    <header className={styles.heading}>
      <div><span className="eyebrow">GMAT QUESTION BANK</span><h2>题目内容管理</h2><p>可编辑题干、文章、表格、选项、答案和解析；新增或删除在保存后生效。</p></div>
      <label className={styles.bankPicker}><span>题型题库</span><select onChange={(event) => changeBank(event.target.value)} value={bankId}>{entries.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    </header>
    {message ? <p className={styles.message} role="status">{message}</p> : null}
    {bank && question ? <>
      <div className={styles.summary}>
        <span>{bank.questions.length} 道题</span><span>{bank.questions.filter((item) => item.answer).length} 道有答案</span>
        <span>{reviewCount} 道待核</span><span>当前版本：{sourceStatus === "static" ? "静态文件" : sourceStatus === "draft" ? "草稿" : "已发布"}{isDirty ? " · 有未保存改动" : ""}</span>
      </div>
      <div className={styles.questionBar}>
        <label><span>题目</span><select onChange={(event) => setSelectedIndex(Number(event.target.value))} value={selectedIndex}>{bank.questions.map((item, index) => <option key={item.id || `${item.number}-${index}`} value={index}>{item.number} · {(item.prompt || "新题").replace(/\s+/g, " ").slice(0, 70)}</option>)}</select></label>
        <div><button className="button secondary" onClick={addQuestion} type="button">新增题目</button><button className="button secondary" disabled={bank.questions.length <= 1} onClick={deleteQuestion} type="button">删除本题</button></div>
      </div>
      <div className={styles.fields}>
        <label><span>题号</span><input min={1} onChange={(event) => updateQuestion({ number: Number(event.target.value) })} type="number" value={question.number} /></label>
        <label><span>题目类型</span><select onChange={(event) => updateQuestion({ answerMode: event.target.value })} value={question.answerMode || "choice"}><option value="choice">单选</option><option value="multi">多选</option><option value="paired">两栏作答</option><option value="text">文本作答</option><option value="essay">写作</option><option value="translation">翻译</option></select></label>
        <label className={styles.wide}><span>题干</span><textarea onChange={(event) => updateQuestion({ prompt: event.target.value })} rows={6} value={question.prompt || ""} /></label>
        <label className={styles.wide}><span>文章或阅读材料</span><textarea onChange={(event) => updateQuestion({ passage: event.target.value })} rows={6} value={question.passage || ""} /></label>
        <label><span>材料标题</span><input onChange={(event) => updateQuestion({ passageTitle: event.target.value })} value={question.passageTitle || ""} /></label>
        <label><span>答案</span><input onChange={(event) => updateQuestion({ answer: event.target.value || null })} value={question.answer || ""} /></label>
        <div className={styles.wide}>
          <div className={styles.fieldLabel}>{question.answerMode === "paired" ? "两栏共用选项" : "选项"}</div>
          <div className={styles.options}>{questionOptions.map((option, index) => <div className={styles.option} key={`${index}-${option.label}`}>
            <input aria-label={`选项 ${index + 1} 标签`} maxLength={2} onChange={(event) => updateOption(index, { label: event.target.value.toUpperCase() })} value={option.label} />
            <textarea aria-label={`选项 ${option.label} 内容`} onChange={(event) => updateOption(index, { text: event.target.value })} rows={2} value={option.text} />
            <button aria-label={`删除选项 ${option.label}`} className={styles.removeButton} onClick={() => updateQuestion({ options: questionOptions.filter((_, optionIndex) => optionIndex !== index) })} type="button">删除</button>
          </div>)}
            <button className="button secondary" onClick={() => updateQuestion({ options: [...questionOptions, { label: "ABCDEFGHI"[questionOptions.length] || `O${questionOptions.length + 1}`, text: "" }] })} type="button">新增选项</button>
          </div>
        </div>
        <label className={styles.wide}><span>题目表格（JSON，纯文字单元格）</span><textarea onChange={(event) => setTableText(event.target.value)} placeholder={'{"headers":["列一","列二"],"rows":[["内容","内容"]]}'} rows={7} value={tableText} /></label>
        <label className={styles.wide}><span>解析</span><textarea onChange={(event) => updateQuestion({ explanation: event.target.value })} rows={7} value={question.explanation || ""} /></label>
        <label><span>来源文件</span><input onChange={(event) => updateQuestion({ source: { ...question.source, file: event.target.value } })} value={question.source?.file || bank.source} /></label>
        <label><span>来源页码</span><input min={1} onChange={(event) => updateQuestion({ source: { ...question.source, page: event.target.value ? Number(event.target.value) : undefined } })} type="number" value={question.source?.page || ""} /></label>
        <label className={styles.wide}><span className={styles.checkbox}><input checked={Boolean(question.reviewRequired)} onChange={(event) => updateQuestion({ reviewRequired: event.target.checked })} type="checkbox" />来源待核</span></label>
        {question.reviewRequired ? <label className={styles.wide}><span>待核说明</span><textarea onChange={(event) => updateQuestion({ reviewNote: event.target.value })} rows={3} value={question.reviewNote || ""} /></label> : null}
      </div>
      <footer className={styles.actions}>
        <button className="button secondary" disabled={isSaving} onClick={() => void saveBank("draft")} type="button">保存草稿</button>
        <button className="button primary" disabled={isSaving} onClick={() => void saveBank("published")} type="button">{isSaving ? "保存中…" : "发布题库"}</button>
      </footer>
    </> : <p>没有可编辑题目，请先选择一个题库或新增题目。</p>}
  </section>;
}
