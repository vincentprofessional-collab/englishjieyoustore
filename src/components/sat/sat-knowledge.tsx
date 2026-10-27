import Link from "next/link";
import styles from "./sat.module.css";
import { getSatKnowledgeIndex } from "@/lib/sat/library";

function pageRange(pages: number[]) {
  if (!pages.length) return "";
  return pages.length === 1 ? `p.${pages[0]}` : `pp.${pages[0]}–${pages[pages.length - 1]}`;
}

export function SatKnowledgeHome() {
  const catalog = getSatKnowledgeIndex();
  return <section className={`${styles.root} ${styles.home}`}>
    {catalog.groups.map((group) => <section className={styles.section} key={group.id}>
      <header className={styles.sectionHeader}><h2>{group.label}</h2><span>{group.topics.length} 个专题</span></header>
      <div className={styles.topicGrid}>{group.topics.map((topic) => <Link className={styles.topicCard} href={`/sat/practice/${topic.setId}`} key={topic.id}>
        <div className={styles.topicCardTop}><span>专项练习</span><strong>{topic.questionCount} 题</strong></div>
        <h3>{topic.label}</h3>
        <p className={styles.topicEnglish}>{topic.title}</p>
        <p className={styles.topicSource}>题目 {pageRange(topic.questionPages)} · 答案 PDF p.{topic.answerPage}</p>
        {topic.reviewRequiredCount ? <small className={styles.topicReview}>{topic.reviewNote}</small> : null}
        <span className={styles.topicAction}>开始训练 <span aria-hidden="true">→</span></span>
      </Link>)}</div>
    </section>)}
  </section>;
}
