"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./sat.module.css";
import type { SatKnowledgeIndex, SatSet } from "@/lib/sat/types";
import { listExamContentOverrides, type ExamContentOverride } from "@/lib/exam-content/overrides";

function pageRange(pages: number[]) {
  if (!pages.length) return "";
  return pages.length === 1 ? `p.${pages[0]}` : `pp.${pages[0]}–${pages[pages.length - 1]}`;
}

export function SatKnowledgeHome() {
  const [catalog, setCatalog] = useState<SatKnowledgeIndex | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/sat/knowledge.json", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("SAT 知识点目录读取失败。");
        return response.json() as Promise<SatKnowledgeIndex>;
      }),
      listExamContentOverrides("sat"),
    ]).then(([index, { overrides }]) => {
      if (!active) return;
      const byId = new Map(overrides.map((row) => [row.bank_id, row]));
      const staticIds = new Set(index.groups.flatMap((group) => group.topics.map((topic) => topic.setId)));
      const topicFromRow = (row: ExamContentOverride) => {
        if (row.is_deleted || !row.bank_data) return null;
        const bank = row.bank_data as unknown as SatSet;
        const questions = Array.isArray(bank.questions) ? bank.questions : [];
        return {
          id: bank.id || row.bank_id,
          setId: bank.id || row.bank_id,
          label: bank.skill || row.title || row.bank_id,
          title: bank.skill || row.title || row.bank_id,
          questionCount: questions.length || bank.expectedCount || 0,
          sourceQuestionCount: questions.length || bank.expectedCount || 0,
          reviewRequiredCount: questions.filter((question) => question.reviewStatus === "review_required").length,
          questionPages: [],
          answerPage: 0,
        };
      };
      const groups = index.groups.map((group) => ({
        ...group,
        topics: group.topics.flatMap((topic) => {
          const row = byId.get(topic.setId);
          if (!row) return [topic];
          const merged = topicFromRow(row);
          return merged ? [{ ...topic, ...merged, id: topic.id }] : [];
        }),
      }));
      const extraRows = overrides.filter((row) => !staticIds.has(row.bank_id));
      const grouped = new Map<string, NonNullable<ReturnType<typeof topicFromRow>>[]>();
      for (const row of extraRows) {
        const topic = topicFromRow(row);
        if (!topic) continue;
        const domain = (row.bank_data as Record<string, unknown> | null)?.domain;
        const label = typeof domain === "string" && domain ? domain : "SAT 新增题库";
        grouped.set(label, [...(grouped.get(label) || []), topic]);
      }
      for (const [label, topics] of grouped) {
        const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sat-added";
        const existing = groups.find((group) => group.label === label);
        if (existing) existing.topics.push(...topics);
        else groups.push({ id, label, topics });
      }
      const totalQuestionCount = groups.reduce((sum, group) => sum + group.topics.reduce((subtotal, topic) => subtotal + topic.questionCount, 0), 0);
      const reviewRequiredCount = groups.reduce((sum, group) => sum + group.topics.reduce((subtotal, topic) => subtotal + topic.reviewRequiredCount, 0), 0);
      setCatalog({ ...index, groups, totalQuestionCount, reviewRequiredCount });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "SAT 知识点目录暂时无法载入。");
    });
    return () => { active = false; };
  }, []);

  if (error) return <section className={`${styles.root} ${styles.home}`}><div className={styles.error}>{error}</div></section>;
  if (!catalog) return <section className={`${styles.root} ${styles.home}`}><div className={styles.loading}>正在载入知识点…</div></section>;
  const topicCount = catalog.groups.reduce((count, group) => count + group.topics.length, 0);

  return <section className={`${styles.root} ${styles.home}`}>
    <header className={styles.homeHeader}>
      <div>
        <span className={styles.eyebrow}>SAT · STANDARD ENGLISH CONVENTIONS</span>
        <h1>知识点</h1>
        <p>按语法考点分类练习原题，答案依据《语法.pdf》第 146 页起的答案表。</p>
      </div>
      <Link className={styles.homeTab} href="/sat">题型训练</Link>
    </header>

    <div className={styles.summary} aria-label="SAT语法知识点总览">
      <div className={styles.summaryItem}><strong>{topicCount}</strong><span>语法专题</span></div>
      <div className={styles.summaryItem}><strong>{catalog.totalQuestionCount}</strong><span>已核对答案题数</span></div>
      <div className={styles.summaryItem}><strong>{catalog.reviewRequiredCount}</strong><span>答案待核对</span></div>
    </div>

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
