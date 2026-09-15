"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./cet4.module.css";
import type { Cet4Entry, Cet4Section } from "@/lib/cet4/library";

type Summary = Pick<Cet4Entry, "id" | "title" | "section" | "topic" | "excerpt">;
const sections: Cet4Section[] = ["知识点", "题型", "试卷"];

export function Cet4Library({ entries }: { entries: Summary[] }) {
  const [section, setSection] = useState<Cet4Section>("知识点");
  const [topic, setTopic] = useState("全部");
  const topics = useMemo(() => ["全部", ...new Set(entries.filter((entry) => entry.section === section).map((entry) => entry.topic))], [entries, section]);
  const visible = entries.filter((entry) => entry.section === section && (topic === "全部" || entry.topic === topic));

  return <main className={styles.library}>
    <section className={styles.hero}>
      <span>LANGUAGE EXAMS · CET-4</span>
      <h1>大学英语四级</h1>
      <p>知识讲解、专项题型与历年试卷各自独立，所有内容均来自四级备课资料，不与雅思、中高考或 SAT 页面混排。</p>
      <dl>{sections.map((item) => <div key={item}><dt>{item}</dt><dd>{entries.filter((entry) => entry.section === item).length}</dd></div>)}</dl>
    </section>

    <nav aria-label="四级内容分类" className={styles.sectionTabs}>
      {sections.map((item) => <button aria-current={section === item ? "page" : undefined} className={section === item ? styles.active : ""} key={item} onClick={() => { setSection(item); setTopic("全部"); }} type="button">{item}</button>)}
    </nav>

    <div className={styles.topicTabs}>{topics.map((item) => <button className={topic === item ? styles.activeTopic : ""} key={item} onClick={() => setTopic(item)} type="button">{item}</button>)}</div>

    <section className={styles.grid}>
      {visible.map((entry) => <Link className={styles.card} href={`/cet4/${entry.id}`} key={entry.id}>
        <span>{entry.topic}</span>
        <h2>{entry.title}</h2>
        <p>{entry.excerpt || "查看完整四级学习内容"}</p>
        <strong>进入页面 →</strong>
      </Link>)}
    </section>
  </main>;
}
