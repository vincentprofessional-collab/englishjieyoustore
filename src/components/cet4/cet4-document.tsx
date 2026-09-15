"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import styles from "./cet4.module.css";
import type { Cet4Entry } from "@/lib/cet4/library";

type PublicEntry = Omit<Cet4Entry, "answers" | "sourceHash">;

function lineKind(line: string) {
  if (/^(?:Part|Section|Directions|Unit|Passage|Questions?\s+\d|大学英语四级)/i.test(line)) return "heading";
  if (/^\s*\d{1,3}[.、．)]\s*/.test(line)) return "question";
  if (/^\s*[A-O][.、．)]\s*/.test(line)) return "option";
  return "paragraph";
}

function TextLine({ line, lineIndex, values, setValue }: { line: string; lineIndex: number; values: Record<string, string>; setValue: (id: string, value: string) => void }) {
  const parts = line.split(/(_{3,}|…{2,}|\.\s*\.\s*\.{1,})/g);
  return <>{parts.map((part, index) => {
    if (!/^(_{3,}|…{2,}|\.\s*\.\s*\.{1,})$/.test(part)) return <Fragment key={index}>{part}</Fragment>;
    const id = `${lineIndex}-${index}`;
    return <input aria-label={`第 ${lineIndex + 1} 行填空`} className={styles.inlineInput} key={id} onChange={(event) => setValue(id, event.target.value)} value={values[id] || ""} />;
  })}</>;
}

export function Cet4Document({ entry }: { entry: PublicEntry }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState("");
  const [answerChecked, setAnswerChecked] = useState(false);
  const lines = useMemo(() => entry.body.split("\n").map((line) => line.trim()).filter(Boolean), [entry.body]);
  const interactive = entry.section !== "知识点";
  const setValue = (id: string, value: string) => setValues((current) => ({ ...current, [id]: value }));
  const submit = async () => {
    setSubmitted(true);
    try {
      const response = await fetch(`/api/cet4-answer?entryId=${encodeURIComponent(entry.id)}`, { method: "POST" });
      const payload = response.ok ? await response.json() as { answers?: string } : {};
      setAnswers(payload.answers || "");
    } finally {
      setAnswerChecked(true);
    }
  };

  return <main className={styles.document}>
    <header className={styles.documentHeader}>
      <Link href="/cet4">← 返回四级目录</Link>
      <span>{entry.section} · {entry.topic}</span>
      <h1>{entry.title}</h1>
      <p>来源：{entry.sourceFiles.join("；")}</p>
    </header>

    <article className={styles.paper}>
      {entry.audioUrl ? <div className={styles.audioPanel}><strong>听力音频</strong><audio controls preload="metadata" src={entry.audioUrl}>你的浏览器暂不支持音频播放。</audio></div> : null}
      {lines.map((line, index) => {
        const kind = lineKind(line);
        if (kind === "heading") return <h2 className={styles.sourceHeading} key={index}>{line}</h2>;
        if (kind === "option") return <button className={`${styles.sourceLine} ${styles.option}`} key={index} onClick={() => setValue(`option-${index}`, line)} type="button"><span aria-hidden="true">○</span><TextLine line={line} lineIndex={index} setValue={setValue} values={values} /></button>;
        return <p className={`${styles.sourceLine} ${kind === "question" ? styles.question : ""}`} key={index}><TextLine line={line} lineIndex={index} setValue={setValue} values={values} /></p>;
      })}

      {interactive ? <section className={styles.responseBox}>
        <label htmlFor="cet4-notes">补充作答区</label>
        <textarea id="cet4-notes" onChange={(event) => setValue("notes", event.target.value)} placeholder="翻译、写作或未能在题面内填写的答案可写在这里" value={values.notes || ""} />
        <button onClick={() => void submit()} type="button">提交本页</button>
        {submitted && answerChecked && !answers ? <p className={styles.saved}>作答已保留。本页源资料未提供可可靠自动判分的标准答案，因此不伪判对错。</p> : null}
      </section> : null}

      {interactive && submitted && answers ? <section className={styles.answers}>
        <h2>原资料答案与解析</h2>
        {answers.split("\n").filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}
      </section> : null}
    </article>
  </main>;
}
