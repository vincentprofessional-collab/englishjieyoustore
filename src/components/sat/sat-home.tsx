"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./sat.module.css";
import type { SatCatalogIndex, SatProgress, SatSetSummary } from "@/lib/sat/types";

const PROGRESS_PREFIX = "sat-progress:v1:";
const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard"];

function readProgress(setId: string): SatProgress {
  try {
    const value = JSON.parse(window.localStorage.getItem(`${PROGRESS_PREFIX}${setId}`) || "null") as Partial<SatProgress> | null;
    return { answers: value?.answers || {}, graded: value?.graded || {}, submitted: value?.submitted || {}, currentIndex: value?.currentIndex || 0, expanded: value?.expanded || {} };
  } catch {
    return { answers: {}, graded: {}, submitted: {}, currentIndex: 0, expanded: {} };
  }
}

function setProgress(set: SatSetSummary) {
  const progress = readProgress(set.id);
  const answered = set.questionIds.filter((id) => Boolean(progress.answers[id])).length;
  return { answered, completed: answered === set.expectedCount };
}

export function SatHome({ view = "knowledge" }: { view?: "knowledge" | "types" | "papers" }) {
  const [catalog, setCatalog] = useState<SatCatalogIndex | null>(null);
  const [error, setError] = useState("");
  const [progressVersion, setProgressVersion] = useState(0);

  useEffect(() => {
    fetch("/sat/index.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<SatCatalogIndex>;
      })
      .then(setCatalog)
      .catch(() => setError("SAT 资料暂时无法载入，请刷新后重试。"));
  }, []);

  const overall = useMemo(() => {
    if (!catalog) return { completed: 0, incomplete: 0 };
    const statuses = catalog.sets.map(setProgress);
    return { completed: statuses.filter((status) => status.completed).length, incomplete: statuses.filter((status) => !status.completed).length };
  }, [catalog, progressVersion]);

  useEffect(() => {
    function update() { setProgressVersion((version) => version + 1); }
    window.addEventListener("storage", update);
    window.addEventListener("sat-progress-updated", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("sat-progress-updated", update);
    };
  }, []);

  if (error) return <section className={styles.root}><div className={styles.error}>{error}</div></section>;
  if (!catalog) return <section className={`${styles.root} ${styles.home}`}><div className={styles.loading}>正在载入题库…</div></section>;

  const domains = catalog.domains.map((item) => ({ ...item, sets: catalog.sets.filter((set) => set.domain === item.label) })).filter((item) => item.sets.length);
  return <section className={`${styles.root} ${styles.home}`}>
    <header className="directory-page-heading">
      <span>SAT READING AND WRITING</span>
      <h1>{view === "knowledge" ? "知识点" : view === "types" ? "题型" : "历年真题"}</h1>
    </header>
    {view === "papers" ? (
      <div className="directory-empty-state">当前仓库尚未导入经过校验的完整 SAT 真题。已有题组请从“题型”进入。</div>
    ) : view === "knowledge" ? (
      domains.map((domain) => (
        <section className={styles.section} key={domain.id}>
          <header className={styles.sectionHeader}><h2>{domain.label}</h2></header>
          <div className={styles.setGrid}>
            {domain.skills.map((skill) => {
              const sets = domain.sets.filter((set) => set.skill === skill.label.replace(/, /g, ",").toLowerCase() || set.skill === skill.label);
              const firstSet = sets[0];
              return firstSet ? (
                <Link className={styles.setCard} href={`/sat/practice/${firstSet.id}`} key={skill.id}>
                  <strong>{skill.label}</strong>
                  <span>{sets.reduce((total, set) => total + set.expectedCount, 0)} 题</span>
                  <small>进入相关题组 →</small>
                </Link>
              ) : null;
            })}
          </div>
        </section>
      ))
    ) : <>
    <div className={styles.summary} aria-label="SAT 题库总览"><div className={styles.summaryItem}><strong>{catalog.totalQuestionCount}</strong><span>总题数</span></div><div className={styles.summaryItem}><strong>{overall.completed}</strong><span>已完成题组</span></div><div className={styles.summaryItem}><strong>{overall.incomplete}</strong><span>未完成题组</span></div></div>
    {domains.length === 0 ? <p className={styles.empty}>没有符合当前筛选条件的题组。</p> : domains.map((item) => {
      const grouped = item.skills.map((skillItem) => ({ ...skillItem, sets: item.sets.filter((set) => set.skill === skillItem.label.replace(/, /g, ",").toLowerCase() || set.skill === skillItem.label) })).filter((group) => group.sets.length);
      return <section className={styles.section} key={item.id}><header className={styles.sectionHeader}><h2>{item.label}</h2><span>{item.sets.reduce((sum, set) => sum + set.expectedCount, 0)} 题</span></header>{grouped.map((group) => <div className={styles.skillGroup} key={group.id}><h3>{group.label}</h3><div className={styles.setGrid}>{group.sets.slice().sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty)).map((set) => { const status = setProgress(set); const percent = set.expectedCount ? Math.round(status.answered / set.expectedCount * 100) : 0; return <Link className={styles.setCard} href={`/sat/practice/${set.id}`} key={set.id}><span className={styles.meta}>{set.difficulty}</span><div className={styles.bar} aria-label={`${status.answered}/${set.expectedCount} 已作答`}><span style={{ width: `${percent}%` }} /></div><div className={styles.setCardStats}><span>{set.expectedCount} 题</span><span>已完成 {status.answered} / 未完成 {set.expectedCount - status.answered}</span></div></Link>; })}</div></div>)}</section>;
    })}
    </>}
  </section>;
}
