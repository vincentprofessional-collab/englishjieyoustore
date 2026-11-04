"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_EXAM_PAGE_COPY, loadLanguageExamContent, type ExamPageCopy, type LanguageExamId } from "@/lib/language-exam-content";
import styles from "./exam-page-presentation.module.css";

export function ExamPagePresentation({ exam }: { exam: LanguageExamId }) {
  const [page, setPage] = useState<ExamPageCopy | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLanguageExamContent().then((content) => {
      if (!cancelled) {
        const nextPage = content.pages[exam];
        const defaults = DEFAULT_EXAM_PAGE_COPY[exam];
        const hasCustomTitle = Boolean(nextPage.title.trim()) && nextPage.title !== defaults.title;
        const hasCustomDescription = Boolean(nextPage.description.trim()) && nextPage.description !== defaults.description;
        setPage(hasCustomTitle || hasCustomDescription || nextPage.blocks.length > 0 ? nextPage : null);
      }
    }).catch(() => {
      // The default title and introduction remain visible when the content store is unavailable.
    });
    return () => { cancelled = true; };
  }, [exam]);

  if (!page) return null;

  const defaults = DEFAULT_EXAM_PAGE_COPY[exam];
  const hasCustomTitle = Boolean(page.title.trim()) && page.title !== defaults.title;
  const hasCustomDescription = Boolean(page.description.trim()) && page.description !== defaults.description;
  return <section className={styles.presentation}>
    {hasCustomTitle || hasCustomDescription ? <div className={styles.heading}>
      {hasCustomTitle ? <h1>{page.title}</h1> : null}
      {hasCustomDescription ? <p>{page.description}</p> : null}
    </div> : null}
    {page.blocks.length ? <div className={styles.blocks}>{page.blocks.map((block) => {
      const content = <><strong>{block.title}</strong><span>{block.body}</span>{block.href && block.linkLabel ? <small>{block.linkLabel} →</small> : null}</>;
      return block.href
        ? <Link className={styles.block} href={block.href} key={block.id}>{content}</Link>
        : <article className={styles.block} key={block.id}>{content}</article>;
    })}</div> : null}
  </section>;
}
