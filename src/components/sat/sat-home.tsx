"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./sat.module.css";
import type { SatCatalogIndex, SatSetSummary } from "@/lib/sat/types";
import { ExamPagePresentation } from "@/components/exam-page-presentation";
import { supabase } from "@/lib/supabase/client";

const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard"];

export function SatHome() {
  const [catalog, setCatalog] = useState<SatCatalogIndex | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      try {
        const response = await fetch("/sat/index.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const base = await response.json() as SatCatalogIndex;
        if (cancelled) return;
        setCatalog(base);
        const { data: rows, error: bankError } = await supabase.from("exam_prep_banks").select("bank_id,title,category,bank_data,is_deleted").eq("exam", "sat").eq("status", "published");
        if (cancelled || bankError || !rows?.length) return;
        const saved = new Map(rows.map((row) => [row.bank_id, row]));
        const knownIds = new Set(base.sets.map((set) => set.id));
        const sets: SatSetSummary[] = base.sets.flatMap((set) => {
          const row = saved.get(set.id);
          if (row?.is_deleted) return [];
          const bank = row?.bank_data && typeof row.bank_data === "object" ? row.bank_data as Record<string, unknown> : null;
          if (!bank) return [set];
          const questionCount = Array.isArray(bank.questions) ? bank.questions.length : set.questionCount ?? set.questionIds.length;
          return [{
            ...set,
            title: typeof bank.title === "string" ? bank.title : row?.title || set.title,
            domain: typeof bank.domain === "string" ? bank.domain : set.domain,
            skill: typeof bank.skill === "string" ? bank.skill : row?.category || set.skill,
            difficulty: bank.difficulty === "Easy" || bank.difficulty === "Medium" || bank.difficulty === "Hard" || bank.difficulty === "Unrated" ? bank.difficulty : set.difficulty,
            questionCount: typeof bank.questionCount === "number" ? bank.questionCount : questionCount,
            expectedCount: typeof bank.expectedCount === "number" ? bank.expectedCount : set.expectedCount,
          }];
        });
        for (const row of rows) {
          const bank = row.bank_data && typeof row.bank_data === "object" ? row.bank_data as Record<string, unknown> : null;
          if (knownIds.has(row.bank_id) || row.is_deleted || !bank || bank.kind === "paper") continue;
          const domain = typeof bank.domain === "string" ? bank.domain : row.category || "新增练习";
          const skill = typeof bank.skill === "string" ? bank.skill : row.title || row.bank_id;
          const questionCount = Array.isArray(bank.questions) ? bank.questions.length : 0;
          sets.push({
            id: row.bank_id,
            assessment: "SAT",
            test: bank.test === "Math" || bank.test === "All" ? bank.test : "Reading and Writing",
            domain,
            skill,
            difficulty: bank.difficulty === "Easy" || bank.difficulty === "Medium" || bank.difficulty === "Hard" || bank.difficulty === "Unrated" ? bank.difficulty : "Unrated",
            title: typeof bank.title === "string" ? bank.title : row.title || row.bank_id,
            questionCount: typeof bank.questionCount === "number" ? bank.questionCount : questionCount,
            expectedCount: typeof bank.expectedCount === "number" ? bank.expectedCount : questionCount,
            questionIds: Array.isArray(bank.questionIds) ? bank.questionIds.filter((id): id is string => typeof id === "string") : [],
            sourceRefs: [],
          });
        }
        const domains = [...base.domains];
        for (const set of sets) {
          const domain = domains.find((item) => item.label === set.domain);
          if (domain && !domain.skills.some((item) => item.label === set.skill)) domain.skills.push({ id: set.skill.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: set.skill });
          else if (!domain) domains.push({ id: set.domain.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: set.domain, skills: [{ id: set.skill.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: set.skill }] });
        }
        if (!cancelled) setCatalog({ ...base, domains, sets });
      } catch {
        if (!cancelled) setError("SAT 资料暂时无法载入，请刷新后重试。");
      }
    }
    void loadCatalog();
    return () => { cancelled = true; };
  }, []);

  if (error) return <section className={styles.root}><div className={styles.error}>{error}</div></section>;
  if (!catalog) return <section className={`${styles.root} ${styles.home}`}><div className={styles.loading}>正在载入题库…</div></section>;

  const domains = catalog.domains.map((item) => ({ ...item, sets: catalog.sets.filter((set) => set.domain === item.label) })).filter((item) => item.sets.length);
  return <section className={`${styles.root} ${styles.home}`}>
    <ExamPagePresentation exam="sat" />
    {domains.length === 0 ? <p className={styles.empty}>没有符合当前筛选条件的题组。</p> : domains.map((item) => {
      const grouped = item.skills.map((skillItem) => ({ ...skillItem, sets: item.sets.filter((set) => set.skill === skillItem.label.replace(/, /g, ",").toLowerCase() || set.skill === skillItem.label) })).filter((group) => group.sets.length);
      return <section className={styles.section} key={item.id}><header className={styles.sectionHeader}><h2>{item.label}</h2></header>{grouped.map((group) => <div className={styles.skillGroup} key={group.id}><h3>{group.label}</h3><div className={styles.setGrid}>{group.sets.slice().sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty)).map((set) => <Link className={styles.setCard} href={`/sat/practice/${set.id}`} key={set.id}><span className={styles.meta}>{set.title || set.difficulty}</span></Link>)}</div></div>)}</section>;
    })}
  </section>;
}
