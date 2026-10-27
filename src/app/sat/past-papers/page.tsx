import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/sat/sat.module.css";
import { getSatPastPaperIndex } from "@/lib/sat/library";

export const metadata: Metadata = {
  title: "SAT 历年真题｜英文解忧杂货铺",
  description: "按年份、地区和模块练习 SAT 历年真题。",
};

export default function SatPastPapersPage() {
  const catalog = getSatPastPaperIndex();
  const years = [...new Set(catalog.papers.map((paper) => paper.year))].sort((a, b) => b - a);

  return <section className={`${styles.root} ${styles.home}`}>
    <header className={styles.homeHeader}>
      <div><span className={styles.eyebrow}>SAT PAST PAPERS</span><h1>历年真题</h1><p>按年份、地区和模块选择题目；题干、选项与答案均为可编辑文字。</p></div>
      <nav aria-label="SAT 学习内容" className={styles.homeTabs}><Link className={styles.homeTab} href="/sat">题型训练</Link><Link className={styles.homeTab} href="/sat/knowledge">知识点</Link></nav>
    </header>
    {years.length ? years.map((year) => {
      const papers = catalog.papers.filter((paper) => paper.year === year).sort((a, b) => (b.month ?? 0) - (a.month ?? 0) || a.title.localeCompare(b.title, "zh-CN"));
      return <section className={styles.section} key={year}>
        <header className={styles.sectionHeader}><h2>{year} 年</h2><span>{papers.reduce((sum, paper) => sum + paper.questionCount, 0)} 题</span></header>
        <div className={styles.setGrid}>{papers.map((paper) => <Link className={styles.setCard} href={`/sat/past-papers/${paper.id}`} key={paper.id}>
          <span className={styles.meta}>{[paper.month ? `${paper.month} 月` : "年份未详", paper.region, paper.sectionLabel].join(" · ")}</span>
          <h3>{paper.title}</h3>
          <div className={styles.setCardStats}><span>{paper.questionCount} 道选择题</span><span>{paper.duplicateCount ? `已去重 ${paper.duplicateCount} 道` : "含答案"}</span></div>
        </Link>)}</div>
      </section>;
    }) : <p className={styles.empty}>真题正在整理中。</p>}
  </section>;
}
