"use client";

import Link from "next/link";
import type { ManagedPageContent } from "@/lib/content/page-content";

export type BbcArticleListGroup = {
  articles: {
    id: string;
    title: string;
    titleChinese?: string;
  }[];
  year: number;
};

export function ArticlesHome({
  content,
  selectedYear,
  yearGroups,
}: {
  content: ManagedPageContent;
  selectedYear: number;
  yearGroups: BbcArticleListGroup[];
}) {
  const activeGroup = yearGroups.find((group) => group.year === selectedYear) ?? yearGroups[0];

  return (
    <section className="stack bbc-home-page">
      <div className="page-heading bbc-hero">
        <div className="eyebrow">{content.eyebrow}</div>
        <h1>{content.title}</h1>
        {content.summary ? <p className="lead">{content.summary}</p> : null}
      </div>

      <div className="bbc-year-panel bbc-year-browser">
        <div className="bbc-year-list">
          {yearGroups.map((group) => (
            <Link
              aria-current={group.year === activeGroup?.year ? "page" : undefined}
              className={`bbc-year-banner ${group.year === activeGroup?.year ? "active" : ""}`}
              href={`/articles?year=${group.year}`}
              key={group.year}
            >
              <span>{group.year}</span>
              <i>›</i>
            </Link>
          ))}
        </div>

        <section className="bbc-selected-year" aria-label={`${activeGroup?.year ?? selectedYear} 年文章`}>
          <header>
            <strong>{activeGroup?.year ?? selectedYear}</strong>
            <span>文章列表</span>
          </header>
          <div className="bbc-article-list">
            {activeGroup?.articles.map((article) => (
              <Link
                className="bbc-article-card"
                href={`/articles/${article.id}`}
                key={article.id}
              >
                <strong>
                  {article.id}-{article.title}
                  {article.titleChinese ? ` ${article.titleChinese}` : ""}
                </strong>
              </Link>
            ))}
          </div>
        </section>
        </div>
    </section>
  );
}
