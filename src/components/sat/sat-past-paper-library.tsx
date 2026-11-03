"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SatPastPaperIndex } from "@/lib/sat/types";
import { supabase } from "@/lib/supabase/client";
import styles from "./sat.module.css";
import { SatSectionNavigation } from "@/components/sat/sat-section-navigation";

export function SatPastPaperLibrary({ initialCatalog }: { initialCatalog: SatPastPaperIndex }) {
  const [papers, setPapers] = useState(initialCatalog.papers);

  useEffect(() => {
    let cancelled = false;
    async function loadOverrides() {
      const { data: rows, error } = await supabase.from("exam_prep_banks").select("bank_id,title,category,bank_data,is_deleted").eq("exam", "sat").eq("status", "published");
      if (cancelled || error || !rows?.length) return;
      const saved = new Map(rows.map((row) => [row.bank_id, row]));
      const knownIds = new Set(initialCatalog.papers.map((paper) => paper.id));
      const current = initialCatalog.papers.flatMap((paper) => {
        const row = saved.get(paper.id);
        if (row?.is_deleted) return [];
        const bank = row?.bank_data && typeof row.bank_data === "object" ? row.bank_data as Record<string, unknown> : null;
        if (!bank) return [paper];
        return [{
          ...paper,
          title: typeof bank.title === "string" ? bank.title : row?.title || paper.title,
          year: typeof bank.year === "number" ? bank.year : typeof bank.year === "string" ? Number(bank.year) || paper.year : paper.year,
          month: typeof bank.month === "number" ? bank.month : paper.month,
          region: typeof bank.region === "string" ? bank.region : paper.region,
          sectionLabel: typeof bank.sectionLabel === "string" ? bank.sectionLabel : paper.sectionLabel,
          questionCount: typeof bank.questionCount === "number" ? bank.questionCount : Array.isArray(bank.questions) ? bank.questions.length : paper.questionCount,
        }];
      });
      const additions = rows.flatMap((row) => {
        const bank = row.bank_data && typeof row.bank_data === "object" ? row.bank_data as Record<string, unknown> : null;
        if (knownIds.has(row.bank_id) || row.is_deleted || !bank || bank.kind !== "paper") return [];
        return [{
          id: row.bank_id,
          title: typeof bank.title === "string" ? bank.title : row.title || row.bank_id,
          year: typeof bank.year === "number" ? bank.year : Number(bank.year) || new Date().getFullYear(),
          month: typeof bank.month === "number" ? bank.month : undefined,
          region: typeof bank.region === "string" ? bank.region : "",
          sectionLabel: typeof bank.sectionLabel === "string" ? bank.sectionLabel : "Reading and Writing",
          questionCount: typeof bank.questionCount === "number" ? bank.questionCount : Array.isArray(bank.questions) ? bank.questions.length : 0,
          duplicateCount: 0,
          sourceRefs: [],
        }];
      });
      setPapers([...current, ...additions]);
    }
    void loadOverrides();
    return () => { cancelled = true; };
  }, [initialCatalog]);

  const years = useMemo(() => [...new Set(papers.map((paper) => paper.year))].sort((a, b) => b - a), [papers]);
  return <section className={`${styles.root} ${styles.home}`}>
    <SatSectionNavigation current="past-papers" />
    {years.length ? years.map((year) => {
      const yearPapers = papers.filter((paper) => paper.year === year).sort((a, b) => (b.month ?? 0) - (a.month ?? 0) || a.title.localeCompare(b.title, "zh-CN"));
      return <section className={styles.section} key={year}>
        <header className={styles.sectionHeader}><h2>{year} 年</h2></header>
        <div className={styles.setGrid}>{yearPapers.map((paper) => <Link className={styles.setCard} href={`/sat/past-papers/${paper.id}`} key={paper.id}>
          <h3>{paper.title}</h3>
        </Link>)}</div>
      </section>;
    }) : <p className={styles.empty}>真题正在整理中。</p>}
  </section>;
}
