"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EXAM_BY_LEVEL, EXAM_LABELS, type VocabularyExamQuestion } from "@/lib/vocabulary/exam-questions";
import styles from "./vocabulary-exam-questions.module.css";

type Page = { total: number; page: number; pageSize: number; questions: Array<Omit<VocabularyExamQuestion, "keywords">> };

export function VocabularyExamQuestions({ word, level }: { word: string; level: string }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState<Record<number, Page>>({});
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const exam = EXAM_BY_LEVEL[level];
  useEffect(() => {
    if (!open || !exam || pages[page]) return;
    const controller = new AbortController();
    setError("");
    void fetch(`/api/vocabulary-exam-questions?word=${encodeURIComponent(word)}&page=${page}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return await response.json() as Page; })
      .then(value => { if (!controller.signal.aborted) setPages(current => ({ ...current, [page]: value })); })
      .catch(() => { if (!controller.signal.aborted) setError("真题暂时无法载入。"); });
    return () => controller.abort();
  }, [exam, open, page, pages, retry, word]);
  if (!exam) return null;
  const current = pages[page];
  return <details className={styles.section} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><strong>真题题目</strong><span>{EXAM_LABELS[exam]} · {open ? "收起 −" : "展开 +"}</span></summary>
    <div className={styles.body}>
      {error ? <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)} type="button">重试</button></p> : !current ? <p role="status">正在载入真题…</p> : !current.total ? <p className={styles.empty}>暂无该词对应等级的填空题或选择题。</p> : <>
        {current.questions.map(question => <article className={styles.question} key={question.id}>
          <div className={styles.source}><span>{question.source} · 第 {question.number} 题 · {question.type === "fill" ? "填空题" : "选择题"}</span><Link href={question.href} prefetch={false}>查看原题</Link></div>
          {question.instruction ? <p className={styles.instruction}>{question.instruction}</p> : null}
          {question.context ? <div className={styles.text}>{question.context}</div> : null}
          {question.prompt ? <p className={styles.text}>{question.prompt}</p> : null}
          {question.options.length ? <ol className={styles.options}>{question.options.map(option => <li key={option.label}><b>{option.label}.</b><span>{option.text}</span></li>)}</ol> : null}
          <details className={styles.answer}><summary>显示答案与解析</summary><p>答案：{question.answers.join(" / ")}</p>{question.explanation ? <p className={styles.text}>{question.explanation}</p> : null}</details>
        </article>)}
        <nav aria-label="真题分页" className={styles.pagination}><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} type="button">上一页</button><span>第 {page} / {Math.max(1, Math.ceil(current.total / current.pageSize))} 页</span><button disabled={page * current.pageSize >= current.total} onClick={() => setPage(value => value + 1)} type="button">下一页</button></nav>
      </>}
    </div>
  </details>;
}
