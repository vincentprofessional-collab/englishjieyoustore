"use client";

import { getBbcPdfQuizIssues, type BbcPdfQuiz, type BbcQuizQuestion } from "@/lib/articles/bbc-quiz";
import styles from "./admin-bbc-article-upload.module.css";

export function AdminBbcPdfQuizEditor({ quiz, onChange, disabled, paragraphCount }: { quiz: BbcPdfQuiz; onChange: (quiz: BbcPdfQuiz | null) => void; disabled?: boolean; paragraphCount?: number }) {
  const issues = getBbcPdfQuizIssues(quiz, paragraphCount);
  function update(kind: "summary" | "matching" | "quiz" | "exercise", index: number, change: Partial<BbcQuizQuestion> | null) {
    const questions = quiz[kind] ?? [];
    onChange({ ...quiz, [kind]: change ? questions.map((question, position) => position === index ? { ...question, ...change } : question) : questions.filter((_, position) => position !== index) });
  }
  return <div className={`${styles.pdfPreview} ${styles.full}`}>
    <header><strong>{quiz.source.pdf}</strong><button className="button secondary" disabled={disabled} onClick={() => onChange(null)} type="button">移除 PDF 练习</button></header>
    {issues.length ? <div className={styles.error} role="status"><strong>请核对以下内容后保存：</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : <p>题目与答案已整理完成。{quiz.matching?.length ? "段落主旨将用于口语复述练习。" : "原文未提供段落配对题，保留现有段落大意。"}</p>}
    <details className={styles.pdfQuestions} open={Boolean(issues.length)}><summary>题目预览与修改 · {(quiz.summary?.length ?? 0) + (quiz.matching?.length ?? 0) + quiz.quiz.length + quiz.exercise.length} 题</summary>
      {([["summary", "总结句选择"], ["matching", "段落主旨配对"], ["quiz", "阅读理解"], ["exercise", "选词填空"]] as const).map(([kind, label]) => (quiz[kind]?.length ?? 0) > 0 ? <fieldset key={kind} disabled={disabled}><legend>{label}</legend>{quiz[kind]?.map((question, index) => <details key={`${kind}-${index}`} open={!question.answer}>
        <summary>第 {question.number} 题 · {question.prompt.length > 95 ? `${question.prompt.slice(0, 95)}…` : question.prompt}{!question.answer ? " · 缺少答案" : ""}</summary>
        <div className={styles.pdfQuestionFields}>
          <label><span>题号</span><input min={1} max={50} type="number" value={question.number} onChange={(event) => update(kind, index, { number: Number(event.target.value) })} /></label>
          <label><span>题干</span><textarea rows={2} value={question.prompt} onChange={(event) => update(kind, index, { prompt: event.target.value })} /></label>
          <label><span>选项（每行一项）</span><textarea rows={3} value={question.options?.join("\n") ?? ""} onChange={(event) => update(kind, index, { options: event.target.value.split("\n").map((option) => option.trim()).filter(Boolean) })} /></label>
          <label><span>正确答案</span>{question.options?.length ? <select value={question.answer} onChange={(event) => update(kind, index, { answer: event.target.value })}><option value="">请选择答案</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input value={question.answer} onChange={(event) => update(kind, index, { answer: event.target.value })} />}</label>
          <button className="button secondary" onClick={() => update(kind, index, null)} type="button">删除此题</button>
        </div>
      </details>)}</fieldset> : null)}
    </details>
  </div>;
}
