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
    {years.length ? years.map((year) => {
      const papers = catalog.papers.filter((paper) => paper.year === year).sort((a, b) => (b.month ?? 0) - (a.month ?? 0) || a.title.localeCompare(b.title, "zh-CN"));
      return <section className={styles.section} key={year}>
        <header className={styles.sectionHeader}><h2>{year} 年</h2></header>
        <div className={styles.setGrid}>{papers.map((paper) => <Link className={styles.setCard} href={`/sat/past-papers/${paper.id}`} key={paper.id}>
          <h3>{paper.title}</h3>
        </Link>)}</div>
      </section>;
    }) : <p className={styles.empty}>真题正在整理中。</p>}
  </section>;
}
