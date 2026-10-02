"use client";

import Link from "next/link";
import type { ManagedPageContent } from "@/lib/content/page-content";

export type BbcArticleListGroup = {
  articles: {
    date: string;
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
        <nav aria-label="按年份浏览 BBC 文章" className="bbc-mobile-year-list">
          {yearGroups.map((group) => <Link aria-current={group.year === activeGroup?.year ? "page" : undefined} className={group.year === activeGroup?.year ? "active" : ""} href={`/articles?year=${group.year}`} key={group.year}>
            <span>{group.year}</span><small>{group.articles.length} 篇</small>
          </Link>)}
        </nav>
        <section className="bbc-selected-year" aria-label={`${activeGroup?.year ?? selectedYear} 年文章`}>
          <header>
            <span>{activeGroup?.year ?? selectedYear} 年文章</span>
            <small>{activeGroup?.articles.length ?? 0} 篇</small>
          </header>
          <div className="bbc-article-list">
            {activeGroup?.articles.map((article) => (
                <div className="bbc-article-card" key={article.id}>
                  <Link className="bbc-article-card-link" href={`/articles/${article.id}`}>
                    <span className="bbc-article-list-meta">{article.date.replaceAll("-", ".")} <span>·</span> {article.id}</span>
                    <strong>{article.title}</strong>
                    {article.titleChinese ? <span className="bbc-article-list-translation">{article.titleChinese}</span> : null}
                  </Link>
                </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
